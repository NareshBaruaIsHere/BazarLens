using BazarLens.Server.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Admin/overview
        // Fetches aggregate counts for the top dashboard metric boxes
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverviewMetrics()
        {
            // 1. User Metrics
            var totalUsers = await _context.Users.CountAsync();
            var activeUsers = await _context.Users.CountAsync(u => u.Status.ToLower() == "active");
            var blockedUsers = await _context.Users.CountAsync(u => u.Status.ToLower() == "blocked");

            // 2. Submission Metrics
            var totalSubmissions = await _context.Submissions.CountAsync();
            var pendingSubmissions = await _context.Submissions.CountAsync(s => s.Status.ToLower() == "pending");
            var verifiedSubmissions = await _context.Submissions.CountAsync(s => s.Status.ToLower() == "verified");
            var rejectedSubmissions = await _context.Submissions.CountAsync(s => s.Status.ToLower() == "rejected");

            // 3. Catalog Metrics
            // Assuming we want to count only active entities, or just use CountAsync() for everything
            var totalProducts = await _context.Products.CountAsync(p => p.Active);
            var totalMarkets = await _context.Markets.CountAsync(m => m.Active);

            return Ok(new
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                BlockedUsers = blockedUsers,
                TotalSubmissions = totalSubmissions,
                PendingReview = pendingSubmissions,
                VerifiedSubmissions = verifiedSubmissions,
                RejectedSubmissions = rejectedSubmissions,
                TotalProducts = totalProducts,
                TotalMarkets = totalMarkets
            });
        }
    }
}