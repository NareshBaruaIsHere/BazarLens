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

        // 1. GET: api/Locations/divisions
        // Populates the "Select division" dropdown
        [HttpGet("divisions")]
        public async Task<IActionResult> GetDivisions()
        {
            var divisions = await _context.Markets
                .Where(m => m.Active == true)
                .Select(m => m.Division)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();

            return Ok(divisions);
        }

        // 2. GET: api/Locations/divisions/{division}/districts
        // Populates the "Select district" dropdown based on chosen division
        [HttpGet("divisions/{division}/districts")]
        public async Task<IActionResult> GetDistrictsByDivision(string division)
        {
            var districts = await _context.Markets
                .Where(m => m.Active == true && m.Division.ToLower() == division.ToLower())
                .Select(m => m.District)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();

            return Ok(districts);
        }

        // 3. GET: api/Locations/districts/{district}/thanas
        // Populates the "Select thana" dropdown based on chosen district
        [HttpGet("districts/{district}/thanas")]
        public async Task<IActionResult> GetThanasByDistrict(string district)
        {
            var thanas = await _context.Markets
                .Where(m => m.Active == true && m.District.ToLower() == district.ToLower())
                .Select(m => m.Area)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();

            return Ok(thanas);
        }

        // 4. GET: api/Locations/thanas/{thana}/bazars
        // Populates the "Select bazar" dropdown based on chosen thana
        [HttpGet("thanas/{thana}/bazars")]
        public async Task<IActionResult> GetBazarsByThana(string thana)
        {
            // Returns both Id and Name so the frontend can use the Id for the submission POST request
            var bazars = await _context.Markets
                .Where(m => m.Active == true && m.Area.ToLower() == thana.ToLower())
                .Select(m => new { m.Id, m.Name })
                .OrderBy(b => b.Name)
                .ToListAsync();

            return Ok(bazars);
        }
    }
}