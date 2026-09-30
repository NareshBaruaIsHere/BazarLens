using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class UserSetting
{
    public Guid UserId { get; set; }

    public string DefaultArea { get; set; } = null!;

    public bool EmailAlerts { get; set; }

    public bool InAppNotifications { get; set; }

    public bool CompactTables { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
