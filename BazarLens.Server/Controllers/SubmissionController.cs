using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

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
        }

        // GET: api/Submission
        // Fetches price submissions with dynamic filtering for the frontend dashboard
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
                .AsQueryable();

            // Apply filters only if the frontend sent them
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
                    SubmissionDate = s.CreatedAt,
                    ProductName = s.Product.Name,
                    ProductCategory = s.Product.Category,
                    ProductUnit = s.Product.Unit,
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

        // POST: api/Submission
        // Allows a logged-in user to report a price
        [HttpPost]
        public async Task<IActionResult> SubmitPrice([FromBody] CreateSubmissionDto dto)
        {
            // Verify entities exist using Guid
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
                CreatedAt = DateTime.UtcNow
            };

            _context.Submissions.Add(newSubmission);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Price submitted successfully!", SubmissionId = newSubmission.Id });
        }
    }
}