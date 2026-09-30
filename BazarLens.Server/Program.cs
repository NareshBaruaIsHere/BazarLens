using BazarLens.Server.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add PostgreSQL Database Service
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure CORS so Naresh's React frontend can connect
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("https://localhost:7864", "http://localhost:7864", "https://localhost:5173", "http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Register Swagger and Controllers
builder.Services.AddSwaggerGen();
builder.Services.AddControllers(options => options.Filters.Add<BazarLens.Server.Services.ApiAccessFilter>());
builder.Services.AddOpenApi();

var app = builder.Build();

// Keep operational failures readable by the frontend without exposing database details.
app.Use(async (context, next) =>
{
    try { await next(); }
    catch (Exception error) when (!context.Response.HasStarted)
    {
        app.Logger.LogError(error, "API request failed");
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new { message = "The server could not complete this request. Check the database connection and server logs." });
    }
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// IMPORTANT: UseCors must go here, BEFORE UseAuthorization and MapControllers
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
