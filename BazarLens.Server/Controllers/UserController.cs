using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BazarLens.Server.Controllers;
[ApiController, Route("api/Users")]
public class UsersController(AppDbContext db) : ControllerBase
{
    public record ProfileDto(string Name,string Email,string? City,string? Thana,string? AvatarUrl);
    public record UserDto(string Name,string Email,string? City,string? Thana,string? AvatarUrl,string? Password,string Role,string Status);
    public record PasswordDto(string CurrentPassword,string NewPassword);
    public record RoleDto(string Role);
    public record StatusDto(string Status);
    async Task ValidateProfile(User user, ProfileDto dto)
    {
        var email = ApiSupport.Email(dto.Email);
        ApiSupport.Require(!await db.Users.AnyAsync(u => u.Id != user.Id && u.Email.ToLower() == email),"This email is already in use.");
        user.Name = ApiSupport.Text(dto.Name,"name"); user.Email = email; user.City = ApiSupport.Text(dto.City,"city"); user.Thana = ApiSupport.Text(dto.Thana,"thana");
        ApiSupport.Require(string.IsNullOrEmpty(dto.AvatarUrl) || Uri.TryCreate(dto.AvatarUrl,UriKind.Absolute,out var uri) && (uri.Scheme == "https" || uri.Scheme == "http"),"Enter a valid avatar URL.");
        user.AvatarUrl = dto.AvatarUrl ?? ""; user.UpdatedAt = DateTime.UtcNow;
    }
    async Task ValidateAccess(User user,string role,string status)
    {
        ApiSupport.Require(new[]{"user","agent","admin"}.Contains(role) && new[]{"active","blocked"}.Contains(status),"Select a valid role and status.");
        ApiSupport.Require(user.Id != HttpContext.Actor().Id || status == "active","You cannot block yourself.");
        if (user.Role == "admin" && user.Status.ToLower() == "active" && (role != "admin" || status != "active"))
            ApiSupport.Require(await db.Users.AnyAsync(u => u.Id != user.Id && u.Role == "admin" && u.Status.ToLower() == "active"),"Keep at least one active administrator.");
        user.Role = role; user.Status = status;
    }
    [HttpGet]
    public async Task<IActionResult> List(string? search,string? role,string? status)
    {
        var query = db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(u => u.Name.ToLower().Contains(search.ToLower()) || u.Email.ToLower().Contains(search.ToLower()));
        if (!string.IsNullOrEmpty(role)) query = query.Where(u => u.Role.ToLower() == role.ToLower());
        if (!string.IsNullOrEmpty(status)) query = query.Where(u => u.Status.ToLower() == status.ToLower());
        return Ok(await query.OrderBy(u => u.Name).Select(u => new {u.Id,u.Name,u.Email,u.City,u.Thana,u.AvatarUrl,u.CreatedAt,Role=u.Role.ToLower(),Status=u.Status.ToLower(),Contributions=db.Submissions.Count(s=>s.UserId==u.Id)}).ToListAsync());
    }
    [HttpGet("{id:guid}/profile")]
    public async Task<IActionResult> Profile(Guid id) { var user=await db.Users.FindAsync(id); return user == null ? NotFound() : Ok(ApiSupport.Profile(user)); }
    [HttpPut("{id:guid}/profile")]
    public async Task<IActionResult> Profile(Guid id,ProfileDto dto) { var user=await db.Users.FindAsync(id); if(user==null)return NotFound(); await ValidateProfile(user,dto); ApiSupport.Activity(db,HttpContext.Actor().Id,"Updated profile"); await db.SaveChangesAsync(); return Ok(ApiSupport.Profile(user)); }
    [HttpPost]
    public async Task<IActionResult> Create(UserDto dto)
    {
        ApiSupport.Require(dto.Role is "user" or "agent","New accounts must be users or agents.");
        var user=new User {Role="user",Status="active",CreatedAt=DateTime.UtcNow,PasswordHash=BCrypt.Net.BCrypt.HashPassword(ApiSupport.Password(dto.Password ?? ""))};
        await ValidateProfile(user,new(dto.Name,dto.Email,dto.City,dto.Thana,dto.AvatarUrl)); await ValidateAccess(user,dto.Role,dto.Status);
        db.Users.Add(user); ApiSupport.Activity(db,HttpContext.Actor().Id,$"Added user {user.Name}"); await db.SaveChangesAsync(); return Ok(ApiSupport.Profile(user));
    }
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id,UserDto dto)
    {
        if(HttpContext.Actor().Role!="admin")return StatusCode(403);
        var user=await db.Users.FindAsync(id); if(user==null)return NotFound();
        await ValidateAccess(user,dto.Role,dto.Status); await ValidateProfile(user,new(dto.Name,dto.Email,dto.City,dto.Thana,dto.AvatarUrl));
        ApiSupport.Activity(db,HttpContext.Actor().Id,$"Updated user {user.Name}"); await db.SaveChangesAsync(); return Ok(ApiSupport.Profile(user));
    }
    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> Role(Guid id,RoleDto dto) {var u=await db.Users.FindAsync(id);if(u==null)return NotFound();await ValidateAccess(u,dto.Role,u.Status.ToLower());await db.SaveChangesAsync();return Ok(ApiSupport.Profile(u));}
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> Status(Guid id,StatusDto dto) {var u=await db.Users.FindAsync(id);if(u==null)return NotFound();await ValidateAccess(u,u.Role,dto.Status);await db.SaveChangesAsync();return Ok(ApiSupport.Profile(u));}
    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> Password(Guid id,PasswordDto dto)
    {
        var u=await db.Users.FindAsync(id);if(u==null)return NotFound();
        ApiSupport.Require(BCrypt.Net.BCrypt.Verify(dto.CurrentPassword,u.PasswordHash),"Current password is incorrect.");
        u.PasswordHash=BCrypt.Net.BCrypt.HashPassword(ApiSupport.Password(dto.NewPassword));u.UpdatedAt=DateTime.UtcNow;
        ApiSupport.Activity(db,u.Id,"Changed password");await db.SaveChangesAsync();return Ok(new{success=true});
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var u=await db.Users.FindAsync(id);if(u==null)return NotFound();
        ApiSupport.Require(id!=HttpContext.Actor().Id,"You cannot delete yourself.");await ValidateAccess(u,"user","blocked");
        ApiSupport.Require(!await db.Submissions.AnyAsync(s=>s.UserId==id) && !await db.SubmissionReviews.AnyAsync(s=>s.ReviewerId==id),"This user has submission history. Block the account instead.");
        await using var tx=await db.Database.BeginTransactionAsync();await db.Activities.Where(a=>a.UserId==id).ExecuteDeleteAsync();
        db.Users.Remove(u);ApiSupport.Activity(db,HttpContext.Actor().Id,$"Deleted user {u.Name}");await db.SaveChangesAsync();await tx.CommitAsync();return Ok(new{success=true});
    }
}
