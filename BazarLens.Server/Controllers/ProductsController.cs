using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateProductDto
        {
            public string Name { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string Unit { get; set; } = string.Empty; // e.g., "kg", "dozen"
        }

        // GET: api/Products
        // Fetches all active products
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products
                .Where(p => p.Active == true)
                .OrderBy(p => p.Category)
                .ThenBy(p => p.Name)
                .ToListAsync();

            return Ok(products);
        }

        // GET: api/Products/categories
        // Fetches a unique list of all categories for the first dropdown
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.Products
                .Where(p => p.Active == true)
                .Select(p => p.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(categories);
        }

        // GET: api/Products/categories/{category}/products
        // Fetches products that belong ONLY to the selected category
        [HttpGet("categories/{category}/products")]
        public async Task<IActionResult> GetProductsByCategory(string category)
        {
            var products = await _context.Products
                .Where(p => p.Active == true && p.Category.ToLower() == category.ToLower())
                .OrderBy(p => p.Name)
                .ToListAsync();

            if (!products.Any())
            {
                return NotFound(new { Message = $"No active products found for category: {category}" });
            }

            return Ok(products);
        }

        // POST: api/Products
        // Allows the admin to add a new product to the catalog
        [HttpPost]
        public async Task<IActionResult> AddProduct([FromBody] CreateProductDto dto)
        {
            bool exists = await _context.Products
                .AnyAsync(p => p.Name.ToLower() == dto.Name.ToLower());

            if (exists)
            {
                return BadRequest(new { Message = "This product already exists in the catalog." });
            }

            var newProduct = new Product
            {
                Name = dto.Name,
                Category = dto.Category,
                Unit = dto.Unit,
                Active = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Products.Add(newProduct);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Product added successfully!", ProductId = newProduct.Id });
        }
    }
}