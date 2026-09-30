using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class PriceAlert
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid ProductId { get; set; }

    public string Area { get; set; } = null!;

    public string Direction { get; set; } = null!;

    public decimal TargetPrice { get; set; }

    public bool Enabled { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
