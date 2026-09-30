using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubmissionController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SubmissionController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateSubmissionDto
        {
            public Guid UserId { get; set; }
            public Guid ProductId { get; set; }
            public Guid MarketId { get; set; }
            public decimal Price { get; set; }
            public string? Quality { get; set; }
            public string? Unit { get; set; }
            public DateOnly? ObservedOn { get; set; }
            public string? Note { get; set; }
        }

        // GET: api/Submission
        // Fetches price submissions with dynamic filtering for the public dashboard
        [HttpGet]
        public async Task<IActionResult> GetRecentSubmissions(
            [FromQuery] string? division,
            [FromQuery] string? district,
            [FromQuery] string? thana,
            [FromQuery] string? bazar,
            [FromQuery] string? category,
            [FromQuery] string? search)
        {
            var query = _context.Submissions
                .Include(s => s.Product)
                .Include(s => s.Market)
                .Include(s => s.User)
                .Where(s => s.Status.ToLower() == "verified") // Show verified submissions on main dashboard
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(division))
                query = query.Where(s => s.Market.Division.ToLower() == division.ToLower());

            if (!string.IsNullOrWhiteSpace(district))
                query = query.Where(s => s.Market.District.ToLower() == district.ToLower());

            if (!string.IsNullOrWhiteSpace(thana))
                query = query.Where(s => s.Market.Area.ToLower() == thana.ToLower());

            if (!string.IsNullOrWhiteSpace(bazar))
                query = query.Where(s => s.Market.Name.ToLower() == bazar.ToLower());

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(s => s.Product.Category.ToLower() == category.ToLower());

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(s => s.Product.Name.ToLower().Contains(search.ToLower()));

            var submissions = await query
                .OrderByDescending(s => s.CreatedAt)
                .Take(50)
                .Select(s => new
                {
                    s.Id,
                    s.Price,
                    s.Unit,
                    s.Quality,
                    s.Status,
                    ObservedOn = s.ObservedOn,
                    SubmissionDate = s.CreatedAt,
                    ProductName = s.Product.Name,
                    ProductCategory = s.Product.Category,
                    MarketName = s.Market.Name,
                    MarketArea = s.Market.Area,
                    MarketCity = s.Market.District,
                    MarketDivision = s.Market.Division,
                    UserName = s.User.Name,
                    UserRole = s.User.Role
                })
                .ToListAsync();

            return Ok(submissions);
        }

        // GET: api/Submission/user/{userId}
        // Fetches a specific user's submissions with personal dashboard filters
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserSubmissions(
            Guid userId,
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? product,
            [FromQuery] DateOnly? date)
        {
            var query = _context.Submissions
                .Include(s => s.Product)
                .Include(s => s.Market)
                .Where(s => s.UserId == userId)
                .AsQueryable();

            // 1. Search Filter (Product or Market Name)
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(s => s.Product.Name.ToLower().Contains(search.ToLower()) ||
                                         s.Market.Name.ToLower().Contains(search.ToLower()));

            // 2. Status Filter
            if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all statuses")
                query = query.Where(s => s.Status.ToLower() == status.ToLower());

            // 3. Product Filter
            if (!string.IsNullOrWhiteSpace(product) && product.ToLower() != "all products")
                query = query.Where(s => s.Product.Name.ToLower() == product.ToLower());

            // 4. Date Filter
            if (date.HasValue)
                query = query.Where(s => s.ObservedOn == date.Value);

            var userSubmissions = await query
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new
                {
                    s.Id,
                    s.Price,
                    s.Unit,
                    Quality = string.IsNullOrEmpty(s.Quality) ? "Not recorded" : s.Quality,
                    s.Status,
                    Date = s.ObservedOn,
                    SubmissionDate = s.CreatedAt,
                    ProductName = s.Product.Name,
                    ProductCategory = s.Product.Category,
                    MarketName = s.Market.Name,
                    MarketArea = s.Market.Area,
                    MarketCity = s.Market.District,
                    MarketDivision = s.Market.Division,
                    Note = s.Note,
                    Actions = s.RejectionReason // Admin rejection feedback text
                })
                .ToListAsync();

            return Ok(userSubmissions);
        }

        // POST: api/Submission
        // Allows a logged-in user or agent to report a price
        [HttpPost]
        public async Task<IActionResult> SubmitPrice([FromBody] CreateSubmissionDto dto)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
            var productExists = await _context.Products.AnyAsync(p => p.Id == dto.ProductId);
            var marketExists = await _context.Markets.AnyAsync(m => m.Id == dto.MarketId);

            if (!userExists || !productExists || !marketExists)
            {
                return BadRequest(new { Message = "Invalid User, Product, or Market ID." });
            }

            if (dto.Price <= 0)
            {
                return BadRequest(new { Message = "Price must be greater than zero." });
            }

            var newSubmission = new Submission
            {
                UserId = dto.UserId,
                ProductId = dto.ProductId,
                MarketId = dto.MarketId,
                Price = dto.Price,
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "kg" : dto.Unit,
                Quality = string.IsNullOrWhiteSpace(dto.Quality) ? "Regular" : dto.Quality,
                ObservedOn = dto.ObservedOn ?? DateOnly.FromDateTime(DateTime.UtcNow),
                Note = dto.Note ?? string.Empty,
                Status = "Pending", // Default initial status
                RejectionReason = string.Empty,
                Flagged = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Submissions.Add(newSubmission);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Price submitted successfully!", SubmissionId = newSubmission.Id });
        }

        // ==========================================
        // ADMIN REVIEW ENDPOINTS
        // ==========================================

        public class ReviewSubmissionDto
        {
            public string Status { get; set; } = string.Empty; // e.g., "Verified" or "Rejected"
            public string RejectionReason { get; set; } = string.Empty; // The note for the user if rejected
        }

        // GET: api/Submission/admin/review
        // Fetches submissions for the Admin review panel with extensive filtering
        [HttpGet("admin/review")]
        public async Task<IActionResult> GetSubmissionsForReview(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? product,
            [FromQuery] DateOnly? date,
            [FromQuery] string? screening,
            [FromQuery] string? contributor,
            [FromQuery] string? market,
            [FromQuery] string? area)
        {
            var query = _context.Submissions
                .Include(s => s.Product)
                .Include(s => s.Market)
                .Include(s => s.User)
                .AsQueryable();

            // 1. Search Box (Searches Product Name or Market Name)
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(s => s.Product.Name.ToLower().Contains(search.ToLower()) ||
                                         s.Market.Name.ToLower().Contains(search.ToLower()));

            // 2. Status (Pending, Verified, Rejected)
            if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all statuses")
                query = query.Where(s => s.Status.ToLower() == status.ToLower());

            // 3. Product
            if (!string.IsNullOrWhiteSpace(product) && product.ToLower() != "all products")
                query = query.Where(s => s.Product.Name.ToLower() == product.ToLower());

            // 4. Date
            if (date.HasValue)
                query = query.Where(s => s.ObservedOn == date.Value);

            // 5. Screening (e.g., Filtering by flagged items)
            if (!string.IsNullOrWhiteSpace(screening) && screening.ToLower() != "all submissions")
            {
                if (screening.ToLower() == "flagged")
                    query = query.Where(s => s.Flagged == true);
            }

            // 6. Contributor (Matches by exact name)
            if (!string.IsNullOrWhiteSpace(contributor) && contributor.ToLower() != "all contributors")
                query = query.Where(s => s.User.Name.ToLower() == contributor.ToLower());

            // 7. Market
            if (!string.IsNullOrWhiteSpace(market) && market.ToLower() != "all markets")
                query = query.Where(s => s.Market.Name.ToLower() == market.ToLower());

            // 8. Area (Thana)
            if (!string.IsNullOrWhiteSpace(area) && area.ToLower() != "all areas")
                query = query.Where(s => s.Market.Area.ToLower() == area.ToLower());

            var submissions = await query
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new
                {
                    s.Id,
                    s.Price,
                    s.Unit,
                    Quality = string.IsNullOrEmpty(s.Quality) ? "Not recorded" : s.Quality,
                    s.Status,
                    s.Flagged,
                    s.Screening, // e.g. "Price differs by 50.4%..."
                    Date = s.ObservedOn,
                    ProductName = s.Product.Name,
                    ProductCategory = s.Product.Category,
                    MarketName = s.Market.Name,
                    MarketArea = s.Market.Area,
                    ContributorName = s.User.Name,
                    RejectionReason = s.RejectionReason
                })
                .ToListAsync();

            return Ok(submissions);
        }

        // PUT: api/Submission/{id}/review
        // Allows the admin to approve or reject a submission
        [HttpPut("{id}/review")]
        public async Task<IActionResult> ReviewSubmission(Guid id, [FromBody] ReviewSubmissionDto dto)
        {
            var submission = await _context.Submissions.FindAsync(id);
            if (submission == null) return NotFound(new { Message = "Submission not found." });

            // Format cleanly to match database conventions (e.g., "verified" -> "Verified")
            string newStatus = char.ToUpper(dto.Status[0]) + dto.Status.Substring(1).ToLower();

            submission.Status = newStatus;

            // Handle the rejection feedback note
            if (newStatus == "Rejected")
            {
                submission.RejectionReason = dto.RejectionReason;
            }
            else if (newStatus == "Verified")
            {
                submission.RejectionReason = string.Empty; // Wipe any previous rejection notes if it gets approved later
            }

            submission.UpdatedAt = DateTime.UtcNow;

            _context.Submissions.Update(submission);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Submission marked as {newStatus}." });
        }
    }
}