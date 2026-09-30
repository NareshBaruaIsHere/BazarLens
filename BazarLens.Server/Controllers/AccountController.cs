using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BazarLens.Server.Controllers;
[ApiController,Route("api/Account")]
public class AccountController(AppDbContext db):ControllerBase
{
    public record AlertDto(Guid ProductId,string? Area,string Direction,decimal TargetPrice,bool Enabled);
    public record SettingsDto(string? DefaultArea,bool EmailAlerts,bool InAppNotifications,bool CompactTables);
    [HttpGet("alerts")]
    public async Task<IActionResult> Alerts()=>Ok(await db.PriceAlerts.AsNoTracking().Where(a=>a.UserId==HttpContext.Actor().Id).OrderByDescending(a=>a.CreatedAt).Select(a=>new{a.Id,a.ProductId,a.Area,a.Direction,a.TargetPrice,a.Enabled,a.CreatedAt,Product=a.Product.Name,Unit=a.Product.Unit}).ToListAsync());
    async Task Save(PriceAlert a,AlertDto dto)
    {
        ApiSupport.Require(await db.Products.AnyAsync(p=>p.Id==dto.ProductId&&p.Active),"Choose an active product.");
        ApiSupport.Require(string.IsNullOrEmpty(dto.Area)||await db.Markets.AnyAsync(m=>m.Area==dto.Area),"Choose a known area.");
        ApiSupport.Require(dto.Direction is "above" or "below","Choose above or below.");ApiSupport.Require(dto.TargetPrice>0,"Target price must be positive.");
        a.ProductId=dto.ProductId;a.Area=dto.Area??"";a.Direction=dto.Direction;a.TargetPrice=dto.TargetPrice;a.Enabled=dto.Enabled;a.UpdatedAt=DateTime.UtcNow;ApiSupport.Activity(db,HttpContext.Actor().Id,"Saved price alert");
    }
    [HttpPost("alerts")]
    public async Task<IActionResult> Create(AlertDto dto){var a=new PriceAlert{UserId=HttpContext.Actor().Id,CreatedAt=DateTime.UtcNow};await Save(a,dto);db.PriceAlerts.Add(a);await db.SaveChangesAsync();return Ok(new{a.Id});}
    [HttpPut("alerts/{id:guid}")]
    public async Task<IActionResult> Edit(Guid id,AlertDto dto){var a=await db.PriceAlerts.SingleOrDefaultAsync(a=>a.Id==id&&a.UserId==HttpContext.Actor().Id);if(a==null)return NotFound();await Save(a,dto);await db.SaveChangesAsync();return Ok(new{a.Id});}
    [HttpDelete("alerts/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id){var a=await db.PriceAlerts.SingleOrDefaultAsync(a=>a.Id==id&&a.UserId==HttpContext.Actor().Id);if(a==null)return NotFound();db.PriceAlerts.Remove(a);await db.SaveChangesAsync();return Ok(new{success=true});}
    [HttpGet("settings")]
    public async Task<IActionResult> Settings(){var s=await db.UserSettings.FindAsync(HttpContext.Actor().Id);return Ok(new{DefaultArea=s?.DefaultArea??"",EmailAlerts=s?.EmailAlerts??false,InAppNotifications=s?.InAppNotifications??true,CompactTables=s?.CompactTables??false});}
    [HttpPut("settings")]
    public async Task<IActionResult> Settings(SettingsDto dto)
    {
        ApiSupport.Require(string.IsNullOrEmpty(dto.DefaultArea)||await db.Markets.AnyAsync(m=>m.Area==dto.DefaultArea),"Choose a known area.");
        var s=await db.UserSettings.FindAsync(HttpContext.Actor().Id);if(s==null){s=new UserSetting{UserId=HttpContext.Actor().Id};db.UserSettings.Add(s);}
        s.DefaultArea=dto.DefaultArea??"";s.EmailAlerts=false;s.InAppNotifications=dto.InAppNotifications;s.CompactTables=dto.CompactTables;s.UpdatedAt=DateTime.UtcNow;await db.SaveChangesAsync();return await Settings();
    }
    [HttpGet("activity")]
    public async Task<IActionResult> Activity(){var u=HttpContext.Actor();return Ok(await db.Activities.AsNoTracking().Where(a=>u.Role=="admin"||a.UserId==u.Id).OrderByDescending(a=>a.CreatedAt).Take(20).Select(a=>new{a.Id,a.Message,a.CreatedAt}).ToListAsync());}
}
