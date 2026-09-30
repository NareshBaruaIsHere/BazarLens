using BazarLens.Server.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LocationsController(AppDbContext context)
        {
            _context = context;
        }

        // Endpoint 1: Gets the list of unique Cities (Districts)
        // GET: api/Locations/cities
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities()
        {
            var cities = await _context.Markets
                .Where(m => m.Active == true)
                .Select(m => m.District)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(cities);
        }

        // Endpoint 2: Gets the list of Thanas (Areas) for a specific City
        // GET: api/Locations/cities/{city}/thanas
        [HttpGet("cities/{city}/thanas")]
        public async Task<IActionResult> GetThanas(string city)
        {
            var thanas = await _context.Markets
                .Where(m => m.Active == true && m.District.ToLower() == city.ToLower())
                .Select(m => m.Area)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();

            if (!thanas.Any())
            {
                return NotFound(new { Message = $"No active thanas found for city: {city}" });
            }

            return Ok(thanas);
        }
    }
}