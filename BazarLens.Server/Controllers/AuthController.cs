using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace BazarLens.Server.Controllers;
[ApiController, Route("api/Auth")]
public class AuthController(AppDbContext db) : ControllerBase
{
    public record RegisterDto(string Name, string Email, string Password, string City, string Thana);
    public record LoginDto(string Email, string Password, bool Remember);
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var email = ApiSupport.Email(dto.Email);
        ApiSupport.Require(!await db.Users.AnyAsync(u => u.Email.ToLower() == email), "Email is already registered.");
        var user = new User { Name = ApiSupport.Text(dto.Name,"name"), Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(ApiSupport.Password(dto.Password)), City = ApiSupport.Text(dto.City,"city"), Thana = ApiSupport.Text(dto.Thana,"thana"), AvatarUrl = "", Role = "user", Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        ApiSupport.Activity(db,user.Id,"Created an account");
        await db.SaveChangesAsync();
        return Ok(ApiSupport.Profile(user));
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var email = ApiSupport.Email(dto.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password,user.PasswordHash)) return Unauthorized(new { message = "Invalid email or password." });
        if (!user.Status.Equals("active",StringComparison.OrdinalIgnoreCase)) return Unauthorized(new { message = "This account is blocked. Contact an administrator." });
        if (Request.Cookies.TryGetValue(ApiSupport.Cookie,out var previous)) { var hash = ApiSupport.Hash(previous); await db.AuthSessions.Where(s => s.TokenHash == hash).ExecuteDeleteAsync(); }
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var expiry = DateTime.UtcNow.AddDays(dto.Remember ? 30 : 1);
        db.AuthSessions.Add(new AuthSession { UserId = user.Id, TokenHash = ApiSupport.Hash(token), ExpiresAt = expiry, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        Response.Cookies.Append(ApiSupport.Cookie,token,new CookieOptions { HttpOnly = true, Secure = Request.IsHttps, SameSite = SameSiteMode.Strict, Path = "/api", Expires = dto.Remember ? new DateTimeOffset(expiry) : null });
        return Ok(new { user = ApiSupport.Profile(user) });
    }
    [HttpGet("session")]
    public IActionResult Session() => new JsonResult(HttpContext.Items["actor"] is User user ? ApiSupport.Profile(user) : null);
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(ApiSupport.Cookie,out var token)) { var hash = ApiSupport.Hash(token); await db.AuthSessions.Where(s => s.TokenHash == hash).ExecuteDeleteAsync(); }
        Response.Cookies.Delete(ApiSupport.Cookie,new CookieOptions { Path = "/api" });
        return Ok(new { success = true });
    }
}
