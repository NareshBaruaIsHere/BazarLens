using BazarLens.Server.Data;
using BazarLens.Server.Models;
using BazarLens.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
namespace BazarLens.Server.Controllers;
[ApiController, Route("api/Submission")]
public class SubmissionController(AppDbContext db) : ControllerBase
{
    public record SubmissionDto(Guid ProductId,Guid MarketId,decimal Price,string Unit,string Quality,DateOnly ObservedOn,string? Note,string? EvidenceUrl);
    public record ReviewDto(string Status,string? RejectionReason);
    IQueryable<Submission> Rows() => db.Submissions.AsNoTracking().Include(s=>s.Product).Include(s=>s.Market).Include(s=>s.User).Include(s=>s.SubmissionReviews);
    static object? Screening(Submission s) {try{return s.Screening==null?null:JsonSerializer.Deserialize<JsonElement>(s.Screening);}catch(JsonException){return null;}}
    public static object PublicRow(Submission s) => new { s.Id,s.ProductId,s.MarketId,s.Price,s.Unit,s.Quality,Date=s.ObservedOn,Product=s.Product.Name,Category=s.Product.Category,Market=s.Market.Name,Area=s.Market.Area,District=s.Market.District,Division=s.Market.Division };
    static object Row(Submission s) => new {s.Id,s.UserId,s.ProductId,s.MarketId,s.Price,s.Unit,s.Quality,Date=s.ObservedOn,s.Note,Status=s.Status.ToLower(),s.RejectionReason,s.Flagged,Screening=Screening(s),EvidenceUrl=Evidence(s),s.CreatedAt,s.UpdatedAt,Product=s.Product.Name,Category=s.Product.Category,Market=s.Market.Name,Area=s.Market.Area,District=s.Market.District,Division=s.Market.Division,User=s.User.Name,History=s.SubmissionReviews.Select(r=>new{r.Status,r.Reason,r.ReviewerId,r.Source,At=r.CreatedAt})};
    static string Evidence(Submission s) {try {using var doc=JsonDocument.Parse(s.Screening??"{}");return doc.RootElement.TryGetProperty("evidenceUrl",out var e)?e.GetString()??"":"";}catch(JsonException){return "";}}
    [HttpGet]
    public async Task<IActionResult> Public(string? division,string? district,string? thana,string? bazar,string? category,string? search)
    {
        var q=Rows().Where(s=>s.Status.ToLower()=="verified");
        if(!string.IsNullOrEmpty(division))q=q.Where(s=>s.Market.Division==division);
        if(!string.IsNullOrEmpty(district))q=q.Where(s=>s.Market.District==district);
        if(!string.IsNullOrEmpty(thana))q=q.Where(s=>s.Market.Area==thana);
        if(!string.IsNullOrEmpty(bazar))q=q.Where(s=>s.Market.Name==bazar);
        if(!string.IsNullOrEmpty(category))q=q.Where(s=>s.Product.Category==category);
        if(!string.IsNullOrEmpty(search))q=q.Where(s=>s.Product.Name.ToLower().Contains(search.ToLower()));
        return Ok((await q.OrderByDescending(s=>s.ObservedOn).ToListAsync()).Select(PublicRow));
    }
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> UserRows(Guid userId,string? status,string? search,string? product,DateOnly? date)
    {
        var q=Rows().Where(s=>s.UserId==userId);
        if(!string.IsNullOrEmpty(status))q=q.Where(s=>s.Status.ToLower()==status.ToLower());
        if(!string.IsNullOrEmpty(search))q=q.Where(s=>s.Product.Name.ToLower().Contains(search.ToLower())||s.Market.Name.ToLower().Contains(search.ToLower()));
        if(!string.IsNullOrEmpty(product))q=q.Where(s=>s.Product.Name==product);
        if(date.HasValue)q=q.Where(s=>s.ObservedOn==date);
        return Ok((await q.OrderByDescending(s=>s.CreatedAt).ToListAsync()).Select(Row));
    }
    [HttpGet("admin/review")]
    public async Task<IActionResult> ReviewRows(string? status,string? search,string? product,DateOnly? date,string? screening,string? contributor,string? market,string? area)
    {
        var q=Rows();
        if(!string.IsNullOrEmpty(status))q=q.Where(s=>s.Status.ToLower()==status.ToLower());
        if(!string.IsNullOrEmpty(search))q=q.Where(s=>s.Product.Name.ToLower().Contains(search.ToLower())||s.Market.Name.ToLower().Contains(search.ToLower()));
        if(!string.IsNullOrEmpty(product))q=q.Where(s=>s.Product.Name==product);
        if(date.HasValue)q=q.Where(s=>s.ObservedOn==date);
        if(screening=="flagged")q=q.Where(s=>s.Flagged);
        if(!string.IsNullOrEmpty(contributor))q=q.Where(s=>s.User.Name==contributor);
        if(!string.IsNullOrEmpty(market))q=q.Where(s=>s.Market.Name==market);
        if(!string.IsNullOrEmpty(area))q=q.Where(s=>s.Market.Area==area);
        return Ok((await q.OrderByDescending(s=>s.CreatedAt).ToListAsync()).Select(Row));
    }
    async Task Apply(Submission s,SubmissionDto dto)
    {
        var p=await db.Products.FindAsync(dto.ProductId);var m=await db.Markets.FindAsync(dto.MarketId);
        ApiSupport.Require(p?.Active==true && m?.Active==true,"Choose an active product and market.");
        ApiSupport.Require(dto.Unit==p!.Unit,"Use the product's default unit.");
        ApiSupport.Require(dto.Price>0 && dto.Price<=1000000,"Price must be between 0.01 and 1,000,000.");
        ApiSupport.Require(new[]{"Standard","Premium","Economy"}.Contains(dto.Quality),"Choose a valid quality.");
        ApiSupport.Require(dto.ObservedOn!=default && dto.ObservedOn<=DateOnly.FromDateTime(DateTime.UtcNow),"Choose a valid observation date that is not in the future.");
        ApiSupport.Require((dto.Note?.Length??0)<=1000,"Note must be at most 1,000 characters.");
        ApiSupport.Require(string.IsNullOrEmpty(dto.EvidenceUrl)||Uri.TryCreate(dto.EvidenceUrl,UriKind.Absolute,out var uri)&&(uri.Scheme=="http"||uri.Scheme=="https"),"Enter a valid evidence URL.");
        s.ProductId=p.Id;s.MarketId=m!.Id;s.Price=dto.Price;s.Unit=p.Unit;s.Quality=dto.Quality;s.ObservedOn=dto.ObservedOn;s.Note=dto.Note??"";s.UpdatedAt=DateTime.UtcNow;
        var cutoff=s.ObservedOn.AddDays(-30);
        var samples=await db.Submissions.AsNoTracking().Where(x=>x.Id!=s.Id&&x.UserId!=s.UserId&&x.Status.ToLower()=="verified"&&x.ProductId==s.ProductId&&x.MarketId==s.MarketId&&x.Unit==s.Unit&&x.ObservedOn>=cutoff&&x.ObservedOn<=s.ObservedOn).ToListAsync();
        var values=samples.Where(x=>!(x.Screening??"").Contains("auto-approved")).GroupBy(x=>x.ObservedOn).Select(g=>g.Average(x=>x.Price)).Order().ToArray();
        decimal? baseline=values.Length<3?null:values.Length%2==1?values[values.Length/2]:(values[values.Length/2-1]+values[values.Length/2])/2;
        decimal? deviation=baseline.HasValue?Math.Abs(s.Price-baseline.Value)/baseline.Value*100:null;
        var decision=baseline==null?"insufficient-data":deviation>25?"unusual":"normal";
        var reason=baseline==null?"Fewer than 3 independently verified days in the previous 30 days. Administrator review required.":$"Price differs by {deviation:F1}% from the recent market median of {baseline:F2}/{s.Unit}.";
        s.Flagged=decision!="normal";
        if(HttpContext.Actor().Role=="agent"&&decision=="normal") {s.Status="verified";decision="auto-approved";s.SubmissionReviews.Add(new SubmissionReview{Status="verified",Source="automatic",Reason=reason,CreatedAt=DateTime.UtcNow});}
        // Evidence accompanies screening in the existing JSONB column, requiring no destructive schema changes.
        s.Screening=JsonSerializer.Serialize(new{policy="market-median-v1",thresholdPercent=25,sampleDays=values.Length,baseline,deviationPercent=deviation,decision,reason,checkedAt=DateTime.UtcNow,evidenceUrl=dto.EvidenceUrl??""});
    }
    [HttpPost]
    public async Task<IActionResult> Create(SubmissionDto dto)
    {
        var s=new Submission{UserId=HttpContext.Actor().Id,Status="pending",RejectionReason="",CreatedAt=DateTime.UtcNow};await Apply(s,dto);db.Submissions.Add(s);ApiSupport.Activity(db,s.UserId,"Submitted a price");await db.SaveChangesAsync();return Ok(new{s.Id,s.Status});
    }
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Edit(Guid id,SubmissionDto dto)
    {
        var s=await db.Submissions.FindAsync(id);if(s==null)return NotFound();
        ApiSupport.Require(s.UserId==HttpContext.Actor().Id&&s.Status.ToLower()=="pending","Only your own pending submissions can be edited.");
        await Apply(s,dto);ApiSupport.Activity(db,s.UserId,"Edited a pending submission");await db.SaveChangesAsync();return Ok(new{s.Id,s.Status});
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var s=await db.Submissions.FindAsync(id);if(s==null)return NotFound();ApiSupport.Require(s.UserId==HttpContext.Actor().Id&&s.Status.ToLower()=="pending","Only your own pending submissions can be deleted.");
        db.Submissions.Remove(s);ApiSupport.Activity(db,s.UserId,"Deleted pending submission");await db.SaveChangesAsync();return Ok(new{success=true});
    }
    [HttpPut("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id,ReviewDto dto)
    {
        ApiSupport.Require(dto.Status is "verified" or "rejected","Choose verified or rejected.");
        var reason=dto.Status=="rejected"?ApiSupport.Text(dto.RejectionReason,"rejection reason",1000):"";
        await using var tx=await db.Database.BeginTransactionAsync();
        var count=await db.Submissions.Where(s=>s.Id==id&&s.Status.ToLower()=="pending").ExecuteUpdateAsync(set=>set.SetProperty(s=>s.Status,dto.Status).SetProperty(s=>s.RejectionReason,reason).SetProperty(s=>s.UpdatedAt,DateTime.UtcNow));
        if(count==0)return Conflict(new{message="This submission no longer exists or has already been reviewed."});
        db.SubmissionReviews.Add(new SubmissionReview{SubmissionId=id,ReviewerId=HttpContext.Actor().Id,Status=dto.Status,Source="manual",Reason=reason,CreatedAt=DateTime.UtcNow});
        ApiSupport.Activity(db,HttpContext.Actor().Id,$"{dto.Status} a submission");await db.SaveChangesAsync();await tx.CommitAsync();return Ok(new{success=true});
    }
}
