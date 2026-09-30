using System;
using System.Collections.Generic;

namespace BazarLens.Server.Models;

public partial class PublicCurrentPrice
{
    public Guid? ProductId { get; set; }

    public string? Product { get; set; }

    public string? Category { get; set; }

    public Guid? MarketId { get; set; }

    public string? Market { get; set; }

    public string? Area { get; set; }

    public string? Unit { get; set; }

    public DateOnly? Date { get; set; }

    public decimal? Average { get; set; }

    public decimal? Lowest { get; set; }

    public decimal? Highest { get; set; }
}
