using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarketsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MarketsController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateMarketDto
        {
            public string Name { get; set; } = string.Empty;
            public string Area { get; set; } = string.Empty; // Thana
            public string District { get; set; } = string.Empty; // City
            public string Division { get; set; } = string.Empty;
        }

        // GET: api/Markets
        // Fetches all markets (useful for displaying tables in the admin panel)
        [HttpGet]
        public async Task<IActionResult> GetMarkets()
        {
            var markets = await _context.Markets
                .OrderBy(m => m.District)
                .ThenBy(m => m.Name)
                .ToListAsync();

            return Ok(markets);
        }

        // POST: api/Markets
        // Allows the admin to add a new market
        [HttpPost]
        public async Task<IActionResult> AddMarket([FromBody] CreateMarketDto dto)
        {
            // Verify the market doesn't already exist in this specific Thana
            bool exists = await _context.Markets
                .AnyAsync(m => m.Name.ToLower() == dto.Name.ToLower() &&
                               m.Area.ToLower() == dto.Area.ToLower());

            if (exists)
            {
                return BadRequest(new { Message = "This market already exists in this area." });
            }

            var newMarket = new Market
            {
                Name = dto.Name,
                Area = dto.Area,
                District = dto.District,
                Division = dto.Division,
                Active = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Markets.Add(newMarket);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Market added successfully!", MarketId = newMarket.Id });
        }
    }
}