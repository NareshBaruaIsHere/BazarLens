using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class Activity
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
