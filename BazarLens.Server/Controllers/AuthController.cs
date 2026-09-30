using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        public class RegisterDto
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string City { get; set; } = string.Empty;
            public string Thana { get; set; } = string.Empty;
            public string Role { get; set; } = "user";
        }

        public class LoginDto
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower());
            if (emailExists)
            {
                return BadRequest(new { Message = "Email is already registered." });
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var newUser = new User
            {
                Name = dto.Name,
                Email = dto.Email.ToLower(),
                PasswordHash = passwordHash,
                Role = dto.Role,
                Status = "active",
                City = dto.City,
                Thana = dto.Thana,
                AvatarUrl = "",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Registration successful!", UserId = newUser.Id });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == dto.Email.ToLower());
            if (user == null)
            {
                return Unauthorized(new { Message = "Invalid email or password." });
            }

            bool isValidPassword = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            if (!isValidPassword)
            {
                return Unauthorized(new { Message = "Invalid email or password." });
            }

            return Ok(new
            {
                Message = "Login successful!",
                User = new { user.Id, user.Name, user.Email, user.Role, user.City, user.Thana }
            });
        }
    }
}