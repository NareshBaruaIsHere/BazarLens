using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // DTOs (Data Transfer Objects)
        // ==========================================

        public class UpdateProfileDto
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? City { get; set; }
            public string? Thana { get; set; }
            public string? AvatarUrl { get; set; }
        }

        public class ChangePasswordDto
        {
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        public class UpdateRoleDto
        {
            public string Role { get; set; } = string.Empty; // e.g., "agent", "user", "admin"
        }

        public class UpdateStatusDto
        {
            public string Status { get; set; } = string.Empty; // e.g., "Active", "Blocked"
        }

        public class CreateAdminUserDto
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? City { get; set; }
            public string? Thana { get; set; } // Maps to the "Area" box in the UI
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "user";
            public string Status { get; set; } = "Active";
        }

        // ==========================================
        // ADMIN ENDPOINTS (User Management Panel)
        // ==========================================

        // GET: api/Users
        // Fetches all users for the Admin panel with Search, Role, and Status filters
        [HttpGet]
        public async Task<IActionResult> GetAllUsers(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] string? status)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => u.Name.ToLower().Contains(search.ToLower()) ||
                                         u.Email.ToLower().Contains(search.ToLower()));

            if (!string.IsNullOrWhiteSpace(role) && role.ToLower() != "all")
                query = query.Where(u => u.Role.ToLower() == role.ToLower());

            if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
                query = query.Where(u => u.Status.ToLower() == status.ToLower());

            var users = await query
                .OrderBy(u => u.Name)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role,
                    u.Status,
                    // Calculates total submissions dynamically for the "Contributions" column
                    Contributions = _context.Submissions.Count(s => s.UserId == u.Id)
                })
                .ToListAsync();

            return Ok(users);
        }

        // PUT: api/Users/{id}/role
        // Promotes or demotes a user (e.g., changing 'user' to 'agent')
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateRoleDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            user.Role = dto.Role.ToLower();
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"User role updated to {user.Role}." });
        }

        // PUT: api/Users/{id}/status
        // Blocks or unblocks a user
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            // Using Capitalized status to match the frontend UI labels
            user.Status = char.ToUpper(dto.Status[0]) + dto.Status.Substring(1).ToLower();
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"User status updated to {user.Status}." });
        }

        // POST: api/Users
        // Allows the admin to manually add a new user or agent
        [HttpPost]
        public async Task<IActionResult> AdminAddUser([FromBody] CreateAdminUserDto dto)
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (emailExists) return BadRequest(new { Message = "Email is already in use." });

            // Format status cleanly (e.g., "active" becomes "Active")
            string formattedStatus = string.IsNullOrWhiteSpace(dto.Status)
                ? "Active"
                : char.ToUpper(dto.Status[0]) + dto.Status.Substring(1).ToLower();

            var newUser = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                City = dto.City,
                Thana = dto.Thana,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role.ToLower(), // Ensure role is lowercase (user, agent, admin)
                Status = formattedStatus,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User created successfully!", UserId = newUser.Id });
        }

        // DELETE: api/Users/{id}
        // Permanently deletes a user from the system
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User deleted successfully." });
        }

        // ==========================================
        // PROFILE ENDPOINTS (Agent & User Panels)
        // ==========================================

        [HttpGet("{id}/profile")]
        public async Task<IActionResult> GetProfile(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Role,
                City = user.City,
                Thana = user.Thana,
                AvatarUrl = user.AvatarUrl
            });
        }

        [HttpPut("{id}/profile")]
        public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            if (user.Email.ToLower() != dto.Email.ToLower())
            {
                bool emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());
                if (emailExists) return BadRequest(new { Message = "This email is already in use." });
            }

            user.Name = dto.Name;
            user.Email = dto.Email;
            user.City = dto.City;
            user.Thana = dto.Thana;
            user.AvatarUrl = dto.AvatarUrl;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Profile updated successfully!" });
        }

        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { Message = "User not found." });

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
            if (!isPasswordValid) return BadRequest(new { Message = "Incorrect current password." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Password changed successfully!" });
        }
    }
}