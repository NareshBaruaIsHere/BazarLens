FROM node:24-bookworm-slim AS node

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
COPY --from=node /usr/local/ /usr/local/
WORKDIR /src
COPY . .
RUN dotnet publish BazarLens.Server/BazarLens.Server.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "BazarLens.Server.dll"]
