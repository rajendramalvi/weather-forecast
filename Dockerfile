# ─── Stage 1: Build ───────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY WeatherForecast/WeatherForecast.csproj WeatherForecast/
RUN dotnet restore WeatherForecast/WeatherForecast.csproj

# Copy all source files and publish
COPY . .
RUN dotnet publish WeatherForecast/WeatherForecast.csproj -c Release -o /app/publish --no-restore

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published output from build stage
COPY --from=build /app/publish .

# Railway / Render injects PORT env var — ASP.NET reads it automatically
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "WeatherForecast.dll"]
