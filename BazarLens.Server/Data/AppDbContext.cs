using System;
using System.Collections.Generic;
using BazarLens.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace BazarLens.Server.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Activity> Activities { get; set; }

    public virtual DbSet<AuthSession> AuthSessions { get; set; }

    public virtual DbSet<Market> Markets { get; set; }

    public virtual DbSet<PriceAlert> PriceAlerts { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<PublicCurrentPrice> PublicCurrentPrices { get; set; }

    public virtual DbSet<Submission> Submissions { get; set; }

    public virtual DbSet<SubmissionReview> SubmissionReviews { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserSetting> UserSettings { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=ep-aged-firefly-b5z21hz2-pooler.c-7.us-east-2.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_J2EfQ8IGyKAj;Ssl Mode=Require;Trust Server Certificate=true;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");

        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_pkey");

            entity.ToTable("activity");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "activity_user_idx").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Activities)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("activity_user_id_fkey");
        });

        modelBuilder.Entity<AuthSession>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("auth_sessions_pkey");

            entity.ToTable("auth_sessions");

            entity.HasIndex(e => e.ExpiresAt, "auth_sessions_expiry_idx");

            entity.HasIndex(e => e.TokenHash, "auth_sessions_token_hash_key").IsUnique();

            entity.HasIndex(e => e.UserId, "auth_sessions_user_idx");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.TokenHash)
                .HasMaxLength(64)
                .HasColumnName("token_hash");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.AuthSessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("auth_sessions_user_id_fkey");
        });

        modelBuilder.Entity<Market>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("markets_pkey");

            entity.ToTable("markets");

            entity.HasIndex(e => e.Area, "markets_area_idx");

            entity.HasIndex(e => new { e.Name, e.Area }, "markets_name_area_unique").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.Area).HasColumnName("area");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.District).HasColumnName("district");
            entity.Property(e => e.Division).HasColumnName("division");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<PriceAlert>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("price_alerts_pkey");

            entity.ToTable("price_alerts");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "price_alerts_user_idx").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Area)
                .HasDefaultValueSql("''::text")
                .HasColumnName("area");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Direction).HasColumnName("direction");
            entity.Property(e => e.Enabled)
                .HasDefaultValue(true)
                .HasColumnName("enabled");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.TargetPrice)
                .HasPrecision(12, 2)
                .HasColumnName("target_price");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Product).WithMany(p => p.PriceAlerts)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("price_alerts_product_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.PriceAlerts)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("price_alerts_user_id_fkey");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("products_pkey");

            entity.ToTable("products");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Unit).HasColumnName("unit");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<PublicCurrentPrice>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("public_current_prices");

            entity.Property(e => e.Area).HasColumnName("area");
            entity.Property(e => e.Average)
                .HasPrecision(12, 2)
                .HasColumnName("average");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.Highest)
                .HasPrecision(12, 2)
                .HasColumnName("highest");
            entity.Property(e => e.Lowest)
                .HasPrecision(12, 2)
                .HasColumnName("lowest");
            entity.Property(e => e.Market).HasColumnName("market");
            entity.Property(e => e.MarketId).HasColumnName("market_id");
            entity.Property(e => e.Product).HasColumnName("product");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Unit).HasColumnName("unit");
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("submissions_pkey");

            entity.ToTable("submissions");

            entity.HasIndex(e => e.CreatedAt, "submissions_flagged_idx")
                .IsDescending()
                .HasFilter("((status = 'pending'::text) AND flagged)");

            entity.HasIndex(e => e.CreatedAt, "submissions_pending_idx")
                .IsDescending()
                .HasFilter("(status = 'pending'::text)");

            entity.HasIndex(e => new { e.ProductId, e.MarketId, e.Unit, e.ObservedOn }, "submissions_prices_idx")
                .IsDescending(false, false, false, true)
                .HasFilter("(status = 'verified'::text)");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "submissions_user_idx").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Flagged).HasColumnName("flagged");
            entity.Property(e => e.MarketId).HasColumnName("market_id");
            entity.Property(e => e.Note)
                .HasDefaultValueSql("''::text")
                .HasColumnName("note");
            entity.Property(e => e.ObservedOn).HasColumnName("observed_on");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quality)
                .HasDefaultValueSql("'Not recorded'::text")
                .HasColumnName("quality");
            entity.Property(e => e.RejectionReason)
                .HasDefaultValueSql("''::text")
                .HasColumnName("rejection_reason");
            entity.Property(e => e.Screening)
                .HasColumnType("jsonb")
                .HasColumnName("screening");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'pending'::text")
                .HasColumnName("status");
            entity.Property(e => e.Unit).HasColumnName("unit");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Market).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.MarketId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("submissions_market_id_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("submissions_product_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("submissions_user_id_fkey");
        });

        modelBuilder.Entity<SubmissionReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("submission_reviews_pkey");

            entity.ToTable("submission_reviews");

            entity.HasIndex(e => new { e.SubmissionId, e.CreatedAt }, "submission_reviews_submission_idx");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Reason)
                .HasDefaultValueSql("''::text")
                .HasColumnName("reason");
            entity.Property(e => e.ReviewerId).HasColumnName("reviewer_id");
            entity.Property(e => e.Source)
                .HasDefaultValueSql("'manual'::text")
                .HasColumnName("source");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.SubmissionId).HasColumnName("submission_id");

            entity.HasOne(d => d.Reviewer).WithMany(p => p.SubmissionReviews)
                .HasForeignKey(d => d.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("submission_reviews_reviewer_id_fkey");

            entity.HasOne(d => d.Submission).WithMany(p => p.SubmissionReviews)
                .HasForeignKey(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("submission_reviews_submission_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AvatarUrl)
                .HasDefaultValueSql("''::text")
                .HasColumnName("avatar_url");
            entity.Property(e => e.City).HasColumnName("city");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.Role)
                .HasDefaultValueSql("'user'::text")
                .HasColumnName("role");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'active'::text")
                .HasColumnName("status");
            entity.Property(e => e.Thana).HasColumnName("thana");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<UserSetting>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("user_settings_pkey");

            entity.ToTable("user_settings");

            entity.Property(e => e.UserId)
                .ValueGeneratedNever()
                .HasColumnName("user_id");
            entity.Property(e => e.CompactTables).HasColumnName("compact_tables");
            entity.Property(e => e.DefaultArea)
                .HasDefaultValueSql("''::text")
                .HasColumnName("default_area");
            entity.Property(e => e.EmailAlerts).HasColumnName("email_alerts");
            entity.Property(e => e.InAppNotifications)
                .HasDefaultValue(true)
                .HasColumnName("in_app_notifications");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.User).WithOne(p => p.UserSetting)
                .HasForeignKey<UserSetting>(d => d.UserId)
                .HasConstraintName("user_settings_user_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
