using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class Submission
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid ProductId { get; set; }

    public Guid MarketId { get; set; }

    public string Unit { get; set; } = null!;

    public string Quality { get; set; } = null!;

    public decimal Price { get; set; }

    public DateOnly ObservedOn { get; set; }

    public string Note { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string RejectionReason { get; set; } = null!;

    public bool Flagged { get; set; }

    public string? Screening { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Market Market { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<SubmissionReview> SubmissionReviews { get; set; } = new List<SubmissionReview>();

    public virtual User User { get; set; } = null!;
}
