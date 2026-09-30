using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BazarLens.Server.Controllers;
[ApiController,Route("api/Markets")]
public class MarketsController(AppDbContext db):ControllerBase
{
    public record MarketDto(string Name,string Area,string District,string Division,bool Active=true);
    [HttpGet]public async Task<IActionResult> List()=>Ok(await db.Markets.AsNoTracking().OrderBy(m=>m.Name).Select(m=>new{m.Id,m.Name,m.Area,m.District,m.Division,m.Active,m.CreatedAt}).ToListAsync());
    async Task Save(Market m,MarketDto dto)
    {
        var name=ApiSupport.Text(dto.Name,"market name");var area=ApiSupport.Text(dto.Area,"thana");
        ApiSupport.Require(!await db.Markets.AnyAsync(x=>x.Id!=m.Id&&x.Name.ToLower()==name.ToLower()&&x.Area.ToLower()==area.ToLower()),"Market already exists in this area.");
        m.Name=name;m.Area=area;m.District=ApiSupport.Text(dto.District,"district");m.Division=ApiSupport.Text(dto.Division,"division");m.Active=dto.Active;m.UpdatedAt=DateTime.UtcNow;ApiSupport.Activity(db,HttpContext.Actor().Id,$"Saved market {name}");
    }
    [HttpPost]public async Task<IActionResult> Create(MarketDto dto){var m=new Market{CreatedAt=DateTime.UtcNow};await Save(m,dto);db.Markets.Add(m);await db.SaveChangesAsync();return Ok(new{m.Id});}
    [HttpPut("{id:guid}")]public async Task<IActionResult> Edit(Guid id,MarketDto dto){var m=await db.Markets.FindAsync(id);if(m==null)return NotFound();await Save(m,dto);await db.SaveChangesAsync();return Ok(new{m.Id});}
    [HttpDelete("{id:guid}")]public async Task<IActionResult> Delete(Guid id){var m=await db.Markets.FindAsync(id);if(m==null)return NotFound();ApiSupport.Require(!await db.Submissions.AnyAsync(s=>s.MarketId==id),"This market has submissions. Deactivate it instead.");db.Markets.Remove(m);ApiSupport.Activity(db,HttpContext.Actor().Id,$"Deleted market {m.Name}");await db.SaveChangesAsync();return Ok(new{success=true});}
}
