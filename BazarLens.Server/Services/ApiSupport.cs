using System.Security.Cryptography;
using System.Text;
using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Services;

public static class ApiSupport
{
    public const string Cookie = "bazarlens_session";
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    public static User Actor(this HttpContext context) => (User)context.Items["actor"]!;
    public static object Profile(User u) => new { u.Id, u.Name, u.Email, u.City, u.Thana, u.AvatarUrl, u.CreatedAt, Role = u.Role.ToLowerInvariant(), Status = u.Status.ToLowerInvariant() };
    public static void Require(bool condition, string message) { if (!condition) throw new ArgumentException(message); }
    public static string Text(string? text, string name, int max = 120) { Require(!string.IsNullOrWhiteSpace(text) && text.Trim().Length <= max, $"Enter a valid {name} (up to {max} characters)."); return text!.Trim(); }
    public static string Email(string? value) { var email = Text(value, "email", 254).ToLowerInvariant(); Require(System.Net.Mail.MailAddress.TryCreate(email, out var parsed) && parsed.Address == email, "Enter a valid email address."); return email; }
    public static string Password(string value) { Require(value.Length >= 8 && Encoding.UTF8.GetByteCount(value) <= 72, "Password must be at least 8 characters and at most 72 UTF-8 bytes."); return value; }
    public static void Activity(AppDbContext db, Guid userId, string message) => db.Activities.Add(new Activity { UserId = userId, Message = message, CreatedAt = DateTime.UtcNow });
}

// Resolve opaque, revocable sessions on every request; client-supplied IDs are never authentication.
public class ApiAccessFilter(AppDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var path = http.Request.Path.Value!.ToLowerInvariant();
        var method = http.Request.Method;
        User? actor = null;
        if (http.Request.Cookies.TryGetValue(ApiSupport.Cookie, out var token))
        {
            var hash = ApiSupport.Hash(token);
            actor = await db.AuthSessions.Where(s => s.TokenHash == hash && s.ExpiresAt > DateTime.UtcNow && s.User.Status.ToLower() == "active").Select(s => s.User).FirstOrDefaultAsync();
        }
        if (actor != null) http.Items["actor"] = actor;
        var isPublic = path.StartsWith("/api/auth/") || method == "GET" && (path == "/api/submission" || path.StartsWith("/api/products") || path == "/api/markets" || path.StartsWith("/api/locations"));
        if (!isPublic && actor == null) { context.Result = new UnauthorizedObjectResult(new { message = "Please sign in with an active account." }); return; }
        var admin = path.StartsWith("/api/admin") || path.Contains("/admin/") || path.EndsWith("/review") ||
            method != "GET" && (path.StartsWith("/api/products") || path.StartsWith("/api/markets")) ||
            path == "/api/users" || path.EndsWith("/role") || path.EndsWith("/status") || method == "DELETE" && path.StartsWith("/api/users/");
        if (admin && actor?.Role.ToLowerInvariant() != "admin") { context.Result = new ObjectResult(new { message = "Administrator access is required." }) { StatusCode = 403 }; return; }
        if (actor != null && actor.Role.ToLowerInvariant() != "admin")
        {
            var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var target = parts.Length > 2 && parts[1] == "users" ? parts[2] : parts.Length > 3 && parts[1] == "submission" && parts[2] == "user" ? parts[3] : null;
            if (Guid.TryParse(target, out var id) && id != actor.Id) { context.Result = new ObjectResult(new { message = "This account is not yours." }) { StatusCode = 403 }; return; }
        }
        var executed = await next();
        if (executed.Exception is ArgumentException error) { executed.ExceptionHandled = true; executed.Result = new BadRequestObjectResult(new { message = error.Message }); }
        else if (executed.Exception is DbUpdateException) { executed.ExceptionHandled = true; executed.Result = new ConflictObjectResult(new { message = "This change conflicts with an existing or referenced record. Refresh and try again." }); }
    }
}
