using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class SubmissionReview
{
    public Guid Id { get; set; }

    public Guid SubmissionId { get; set; }

    public string Status { get; set; } = null!;

    public Guid? ReviewerId { get; set; }

    public string Source { get; set; } = null!;

    public string Reason { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual User? Reviewer { get; set; }

    public virtual Submission Submission { get; set; } = null!;
}
