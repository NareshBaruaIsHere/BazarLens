using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using BazarLens.Server.Data;
using BazarLens.Server.Models;
using Microsoft.EntityFrameworkCore;

// Opt-in live integration test. Creates uniquely named fixtures, then deletes only those IDs.
// Run from repository root with the backend listening at API_TEST_URL (default port 5029).
var config=JsonNode.Parse(await File.ReadAllTextAsync("BazarLens.Server/appsettings.json"))!;
var connection=Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")??config["ConnectionStrings"]!["DefaultConnection"]!.GetValue<string>();
await using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection).Options);
if(args.Contains("--accounts"))
{
    foreach(var account in await db.Users.AsNoTracking().Where(u=>new[]{"admin","agent"}.Contains(u.Role.ToLower())).OrderBy(u=>u.Role).ThenBy(u=>u.Email).Select(u=>new{u.Email,Role=u.Role,Status=u.Status}).ToListAsync())
        Console.WriteLine($"{account.Role}|{account.Status}|{account.Email}");
    return;
}
if(args.Contains("--create-admin"))
{
    const string email="admin.recovery@bazarlens.com";
    if(await db.Users.AnyAsync(u=>u.Email.ToLower()==email))
    {
        Console.WriteLine($"Account {email} already exists. No changes were made; choose a different address to create another login.");
        return;
    }
    var recoveryPassword=Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).Replace("+","A").Replace("/","b").Replace("=","");
    var adminAccount=new User{Id=Guid.NewGuid(),Name="BazerLens Admin",Email=email,PasswordHash=BCrypt.Net.BCrypt.HashPassword(recoveryPassword),Role="admin",Status="active",City="Dhaka",Thana="Dhaka",AvatarUrl="",CreatedAt=DateTime.UtcNow,UpdatedAt=DateTime.UtcNow};
    db.Users.Add(adminAccount);
    db.Activities.Add(new Activity{UserId=adminAccount.Id,Message="Administrator login provisioned",CreatedAt=DateTime.UtcNow});
    await db.SaveChangesAsync();
    Console.WriteLine($"ADMIN_EMAIL={email}");
    Console.WriteLine($"ADMIN_PASSWORD={recoveryPassword}");
    return;
}
var origin=Environment.GetEnvironmentVariable("API_TEST_URL")??"http://localhost:5029";
HttpClient Client()=>new(new HttpClientHandler{CookieContainer=new CookieContainer(),AllowAutoRedirect=false}){BaseAddress=new Uri(origin)};
using var admin=Client();using var user=Client();using var other=Client();using var guest=Client();
var tag=Guid.NewGuid().ToString("N");var password="Integration@123";
var userIds=new List<Guid>();var productIds=new List<Guid>();var marketIds=new List<Guid>();
var passed=0;
void Check(bool condition,string label){if(!condition)throw new Exception(label);passed++;Console.WriteLine($"PASS: {label}");}
async Task<JsonNode?> Call(HttpClient client,string method,string path,object? body=null,int expected=200)
{
    using var req=new HttpRequestMessage(new HttpMethod(method),"/api"+path);if(body!=null)req.Content=JsonContent.Create(body);
    using var response=await client.SendAsync(req);var raw=await response.Content.ReadAsStringAsync();
    if((int)response.StatusCode!=expected)throw new Exception($"{method} {path}: expected {expected}, got {(int)response.StatusCode}. {raw[..Math.Min(raw.Length,400)]}");
    return string.IsNullOrWhiteSpace(raw)?null:JsonNode.Parse(raw);
}
Guid Id(JsonNode? node)=>Guid.Parse(node!["id"]!.GetValue<string>());
try
{
    var a=new User{Id=Guid.NewGuid(),Name="Integration Admin",Email=$"integration-admin-{tag}@example.invalid",PasswordHash=BCrypt.Net.BCrypt.HashPassword(password),Role="admin",Status="active",City="Test",Thana="Test",AvatarUrl="",CreatedAt=DateTime.UtcNow,UpdatedAt=DateTime.UtcNow};
    userIds.Add(a.Id);db.Users.Add(a);await db.SaveChangesAsync();
    await Call(guest,"GET","/Admin/overview",expected:401);Check(true,"Anonymous admin access denied");
    await Call(admin,"POST","/Auth/login",new{email=a.Email,password,remember=true});
    Check(Id(await Call(admin,"GET","/Auth/session"))==a.Id,"Database session restores administrator");
    var registration=new{name="Integration User",email=$"integration-user-{tag}@example.invalid",password,city="Dhaka",thana="Mirpur",role="admin"};
    var u=await Call(user,"POST","/Auth/register",registration);var uid=Id(u);userIds.Add(uid);
    Check(u!["role"]!.GetValue<string>()=="user","Registration cannot grant administrator role");
    await Call(user,"POST","/Auth/login",new{registration.email,password});
    await Call(user,"GET","/Admin/overview",expected:403);Check(true,"User admin access denied");
    await Call(user,"GET",$"/Users/{a.Id}/profile",expected:403);Check(true,"Another user's profile is protected");
    var product=await Call(admin,"POST","/Products",new{name=$"Integration rice {tag}",category="Test",unit="kg",active=true});var pid=Id(product);productIds.Add(pid);
    var market=await Call(admin,"POST","/Markets",new{name=$"Integration market {tag}",area="Test Thana",district="Test District",division="Test Division",active=true});var mid=Id(market);marketIds.Add(mid);
    await Call(admin,"PUT",$"/Products/{pid}",new{name=$"Integration rice {tag}",category="Test",unit="kg",active=false});
    var products=(await Call(guest,"GET","/Products"))!.AsArray();Check(products.Any(p=>Id(p)==pid&&!p!["active"]!.GetValue<bool>()),"Inactive products remain visible in admin catalog");
    await Call(admin,"PUT",$"/Products/{pid}",new{name=$"Integration rice {tag}",category="Test",unit="kg",active=true});
    var locations=(await Call(guest,"GET","/Locations/thanas/Test%20Thana/bazars"))!.AsArray();Check(locations.Any(m=>Id(m)==mid),"Location cascade returns database market ID");
    var date=DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
    object Submission(decimal price)=>new{productId=pid,marketId=mid,price,unit="kg",quality="Standard",observedOn=date,note="Integration test",evidenceUrl="https://example.com/evidence",userId=a.Id};
    await Call(user,"POST","/Submission",Submission(-1),400);Check(true,"Invalid price rejected");
    var submission=await Call(user,"POST","/Submission",Submission(30));var sid=Id(submission);
    await Call(user,"PUT",$"/Submission/{sid}",Submission(40));
    var rows=(await Call(user,"GET",$"/Submission/user/{uid}"))!.AsArray();var row=rows.Single(r=>Id(r)==sid)!;
    Check(row["userId"]!.GetValue<string>()==uid.ToString()&&row["price"]!.GetValue<decimal>()==40,"Submission ownership ignores forged user ID and edits persist");
    Check(row["evidenceUrl"]!.GetValue<string>()=="https://example.com/evidence"&&row["screening"]!["decision"]!.GetValue<string>()=="insufficient-data","Evidence and screening persist");
    await Call(user,"PUT",$"/Submission/{sid}/review",new{status="verified"},403);Check(true,"Only administrators review prices");
    await Call(admin,"PUT",$"/Submission/{sid}/review",new{status="verified"});
    await Call(admin,"PUT",$"/Submission/{sid}/review",new{status="verified"},409);Check(true,"Duplicate reviews rejected");
    var publicRows=(await Call(guest,"GET","/Submission"))!.AsArray();var publicRow=publicRows.Single(r=>Id(r)==sid)!;
    Check(publicRow["userId"]==null&&publicRow["note"]==null&&publicRow["price"]!.GetValue<decimal>()==40,"Verified public prices omit private contributor details");
    await Call(user,"PUT",$"/Submission/{sid}",Submission(50),400);Check(true,"Reviewed reports are immutable");
    var disposable=Id(await Call(user,"POST","/Submission",Submission(31)));await Call(user,"DELETE",$"/Submission/{disposable}");Check(true,"Pending report deletion works");
    var alert=Id(await Call(user,"POST","/Account/alerts",new{productId=pid,area="Test Thana",direction="above",targetPrice=20,enabled=true}));
    await Call(user,"PUT",$"/Account/alerts/{alert}",new{productId=pid,area="Test Thana",direction="above",targetPrice=25,enabled=false});
    Check((await Call(user,"GET","/Account/alerts"))!.AsArray().Any(r=>Id(r)==alert&&!r!["enabled"]!.GetValue<bool>()),"Alert edits persist");
    await Call(user,"DELETE",$"/Account/alerts/{alert}");
    await Call(user,"PUT","/Account/settings",new{defaultArea="Test Thana",inAppNotifications=false,compactTables=true});
    Check((await Call(user,"GET","/Account/settings"))!["compactTables"]!.GetValue<bool>(),"Preferences persist");
    await Call(user,"PUT",$"/Users/{uid}/profile",new{name="Updated Integration User",email=registration.email,city="Dhaka",thana="Mirpur",avatarUrl=""});
    Check((await Call(user,"GET","/Auth/session"))!["name"]!.GetValue<string>()=="Updated Integration User","Profile changes appear in restored session");
    await Call(user,"PUT",$"/Users/{uid}/password",new{currentPassword=password,newPassword="Changed@123"});
    await Call(other,"POST","/Auth/login",new{registration.email,password="Changed@123"});Check(true,"Changed password signs in");
    await Call(admin,"PUT",$"/Users/{uid}/status",new{status="blocked"});
    await Call(other,"GET","/Account/settings",expected:401);Check(true,"Blocking an account invalidates access immediately");
    await Call(admin,"PUT",$"/Users/{uid}/status",new{status="active"});
    await Call(admin,"DELETE",$"/Products/{pid}",expected:400);await Call(admin,"DELETE",$"/Markets/{mid}",expected:400);Check(true,"Referenced catalog records cannot be deleted");
    // Three manually verified days must be from a different contributor than the agent.
    foreach(var days in new[]{1,2})
    {
        var baselineId=Id(await Call(user,"POST","/Submission",new{productId=pid,marketId=mid,price=40,unit="kg",quality="Standard",observedOn=DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-days).ToString("yyyy-MM-dd")}));
        await Call(admin,"PUT",$"/Submission/{baselineId}/review",new{status="verified"});
    }
    var agentEmail=$"integration-agent-{tag}@example.invalid";
    var agentId=Id(await Call(admin,"POST","/Users",new{name="Integration Agent",email=agentEmail,city="Dhaka",thana="Mirpur",password,role="agent",status="active"}));userIds.Add(agentId);
    await Call(other,"POST","/Auth/login",new{email=agentEmail,password});
    var automatic=await Call(other,"POST","/Submission",Submission(40));
    Check(automatic!["status"]!.GetValue<string>()=="verified","Normal agent price is automatically verified against three independent days");
    var unusualId=Id(await Call(other,"POST","/Submission",Submission(100)));
    var agentRows=(await Call(other,"GET",$"/Submission/user/{agentId}"))!.AsArray();
    Check(agentRows.Single(r=>Id(r)==unusualId)!["flagged"]!.GetValue<bool>(),"Unusual agent price enters flagged review queue");
    await Call(admin,"PUT",$"/Submission/{unusualId}/review",new{status="rejected",rejectionReason="Integration rejection"});
    var rejected=(await Call(other,"GET",$"/Submission/user/{agentId}"))!.AsArray().Single(r=>Id(r)==unusualId)!;
    Check(rejected["status"]!.GetValue<string>()=="rejected"&&rejected["rejectionReason"]!.GetValue<string>()=="Integration rejection","Rejection feedback persists for contributor");
    await Call(admin,"POST","/Auth/logout");Check(await Call(admin,"GET","/Auth/session")==null,"Logout revokes session");
    Console.WriteLine($"PASS: {passed} live PostgreSQL/API checks.");
}
finally
{
    // Only remove fixtures this test created; never reset or alter existing application records.
    db.ChangeTracker.Clear();
    await using var tx=await db.Database.BeginTransactionAsync();
    var submissions=db.Submissions.Where(s=>userIds.Contains(s.UserId)).Select(s=>s.Id);
    await db.SubmissionReviews.Where(r=>submissions.Contains(r.SubmissionId)||r.ReviewerId.HasValue&&userIds.Contains(r.ReviewerId.Value)).ExecuteDeleteAsync();
    await db.Submissions.Where(s=>userIds.Contains(s.UserId)).ExecuteDeleteAsync();
    await db.PriceAlerts.Where(a=>userIds.Contains(a.UserId)).ExecuteDeleteAsync();
    await db.UserSettings.Where(s=>userIds.Contains(s.UserId)).ExecuteDeleteAsync();
    await db.AuthSessions.Where(s=>userIds.Contains(s.UserId)).ExecuteDeleteAsync();
    await db.Activities.Where(a=>userIds.Contains(a.UserId)).ExecuteDeleteAsync();
    await db.Users.Where(u=>userIds.Contains(u.Id)).ExecuteDeleteAsync();
    await db.Products.Where(p=>productIds.Contains(p.Id)).ExecuteDeleteAsync();
    await db.Markets.Where(m=>marketIds.Contains(m.Id)).ExecuteDeleteAsync();
    await tx.CommitAsync();Console.WriteLine("Cleaned up integration fixtures.");
}
