using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class Market
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Area { get; set; } = null!;

    public string District { get; set; } = null!;

    public string Division { get; set; } = null!;

    public bool Active { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
