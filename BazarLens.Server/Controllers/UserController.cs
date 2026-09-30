using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        // This injects the database connection we set up in Program.cs
        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("test-connection")]
        public IActionResult CreateTestAdmin()
        {
            try
            {
                // Create a new user object based on your scaffolded Neon schema
                var testUser = new User
                {
                    Name = "Sumit",
                    Email = "sumit@bazarlens.com",
                    PasswordHash = "temporary_hash_123", // We will build real hashing later
                    Role = "admin",
                    Status = "active",
                    City = "Chattogram",
                    Thana = "Kotwali",
                    AvatarUrl = "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add to Entity Framework and push to Neon
                _context.Users.Add(testUser);
                _context.SaveChanges();

                return Ok(new
                {
                    Message = "SUCCESS! Connected to Neon.",
                    User = testUser
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "FAILED to connect to Neon.",
                    Error = ex.Message
                });
            }
        }
    }
}