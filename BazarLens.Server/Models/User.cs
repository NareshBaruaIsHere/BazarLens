using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class User
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string City { get; set; } = null!;

    public string Thana { get; set; } = null!;

    public string AvatarUrl { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Activity> Activities { get; set; } = new List<Activity>();

    public virtual ICollection<AuthSession> AuthSessions { get; set; } = new List<AuthSession>();

    public virtual ICollection<PriceAlert> PriceAlerts { get; set; } = new List<PriceAlert>();

    public virtual ICollection<SubmissionReview> SubmissionReviews { get; set; } = new List<SubmissionReview>();

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();

    public virtual UserSetting? UserSetting { get; set; }
}
