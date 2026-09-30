using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BazarLens.Server.Controllers;
[ApiController,Route("api/Products")]
public class ProductsController(AppDbContext db):ControllerBase
{
    public record ProductDto(string Name,string Category,string Unit,bool Active=true);
    [HttpGet] public async Task<IActionResult> List()=>Ok(await db.Products.AsNoTracking().OrderBy(p=>p.Name).Select(p=>new{p.Id,p.Name,p.Category,p.Unit,p.Active,p.CreatedAt}).ToListAsync());
    [HttpGet("categories")] public async Task<IActionResult> Categories()=>Ok(await db.Products.Where(p=>p.Active).Select(p=>p.Category).Distinct().Order().ToListAsync());
    [HttpGet("categories/{category}/products")] public async Task<IActionResult> Category(string category)=>Ok(await db.Products.Where(p=>p.Active&&p.Category.ToLower()==category.ToLower()).Select(p=>new{p.Id,p.Name,p.Category,p.Unit,p.Active}).ToListAsync());
    async Task Save(Product p,ProductDto dto)
    {
        var name=ApiSupport.Text(dto.Name,"product name");var unit=ApiSupport.Text(dto.Unit,"unit",20);
        ApiSupport.Require(!await db.Products.AnyAsync(x=>x.Id!=p.Id&&x.Name.ToLower()==name.ToLower()),"Product name already exists.");
        ApiSupport.Require(p.Id==Guid.Empty||p.Unit==unit||!await db.Submissions.AnyAsync(s=>s.ProductId==p.Id),"Units on referenced products cannot change. Create a new product instead.");
        p.Name=name;p.Unit=unit;p.Category=ApiSupport.Text(dto.Category,"category");p.Active=dto.Active;p.UpdatedAt=DateTime.UtcNow;
        ApiSupport.Activity(db,HttpContext.Actor().Id,$"Saved product {name}");
    }
    [HttpPost] public async Task<IActionResult> Create(ProductDto dto){var p=new Product{CreatedAt=DateTime.UtcNow};await Save(p,dto);db.Products.Add(p);await db.SaveChangesAsync();return Ok(new{p.Id});}
    [HttpPut("{id:guid}")] public async Task<IActionResult> Edit(Guid id,ProductDto dto){var p=await db.Products.FindAsync(id);if(p==null)return NotFound();await Save(p,dto);await db.SaveChangesAsync();return Ok(new{p.Id});}
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id){var p=await db.Products.FindAsync(id);if(p==null)return NotFound();ApiSupport.Require(!await db.Submissions.AnyAsync(s=>s.ProductId==id)&&!await db.PriceAlerts.AnyAsync(a=>a.ProductId==id),"This product is referenced. Deactivate it instead.");db.Products.Remove(p);ApiSupport.Activity(db,HttpContext.Actor().Id,$"Deleted product {p.Name}");await db.SaveChangesAsync();return Ok(new{success=true});}
}
