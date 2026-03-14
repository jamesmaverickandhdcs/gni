import time
import json
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable

# ============================================================
# GNI Geocoding Engine — 3-Layer Cache System
# Layer 1: In-memory cache (fastest)
# Layer 2: Manual known locations (offline fallback)
# Layer 3: Nominatim API (live lookup)
# ============================================================

# Layer 2: Manual cache for common geopolitical locations
KNOWN_LOCATIONS = {
    # Middle East
    "israel": (31.0461, 34.8516),
    "iran": (32.4279, 53.6880),
    "beirut": (33.8886, 35.4955),
    "lebanon": (33.8547, 35.8623),
    "gaza": (31.3547, 34.3088),
    "tehran": (35.6892, 51.3890),
    "iraq": (33.2232, 43.6793),
    "syria": (34.8021, 38.9968),
    "saudi arabia": (23.8859, 45.0792),
    "yemen": (15.5527, 48.5164),
    # Europe/Russia
    "ukraine": (48.3794, 31.1656),
    "russia": (61.5240, 105.3188),
    "kyiv": (50.4501, 30.5234),
    "moscow": (55.7558, 37.6173),
    "nato": (50.8503, 4.3517),
    # Asia-Pacific
    "china": (35.8617, 104.1954),
    "taiwan": (23.6978, 120.9605),
    "north korea": (40.3399, 127.5101),
    "south korea": (35.9078, 127.7669),
    "india": (20.5937, 78.9629),
    "pakistan": (30.3753, 69.3451),
    "japan": (36.2048, 138.2529),
    # Americas
    "united states": (37.0902, -95.7129),
    "washington": (38.9072, -77.0369),
    "new york": (40.7128, -74.0060),
    # Africa
    "sudan": (12.8628, 30.2176),
    "ethiopia": (9.1450, 40.4897),
    "somalia": (5.1521, 46.1996),
      # Multi-region fallbacks
    "middle east": (29.2985, 42.5510),
    "middle east and europe": (35.0000, 38.0000),
    "europe": (54.5260, 15.2551),
    "asia": (34.0479, 100.6197),
    "africa": (8.7832, 34.5085),
    "global": (20.0000, 0.0000),
    "southeast asia": (12.8797, 121.7740),
    "eastern europe": (52.0000, 30.0000),
    "persian gulf": (26.9000, 50.5500),
    "south asia": (20.0000, 77.0000),
    "middle east and north america": (35.0000, 38.0000),
    "north america": (54.5260, -105.2551),
    "latin america": (-8.7832, -55.4915),
    "west africa": (12.3714, -1.5197),
    "central asia": (46.0000, 65.0000),
}

# Layer 1: In-memory runtime cache
_memory_cache: dict = {}

# Nominatim geolocator (Layer 3)
_geolocator = Nominatim(user_agent="GNI_Diploma_Project_v1")


def _normalize(location: str) -> str:
    return location.lower().strip()


def geocode(location: str, retries: int = 2) -> dict | None:
    """
    Geocode a location string using 3-layer cache.
    Returns: {"lat": float, "lng": float, "name": str} or None
    """
    if not location:
        return None

    key = _normalize(location)

    # Layer 1: Memory cache
    if key in _memory_cache:
        return _memory_cache[key]

    # Layer 2: Known locations — check exact match first, then partial
    for known, coords in KNOWN_LOCATIONS.items():
        if known == key:  # exact match first
            result = {"lat": coords[0], "lng": coords[1], "name": location}
            _memory_cache[key] = result
            return result

    for known, coords in KNOWN_LOCATIONS.items():
        if known in key or key in known:
            result = {"lat": coords[0], "lng": coords[1], "name": location}
            _memory_cache[key] = result
            return result

    # Skip Nominatim for multi-word region names — too unreliable
    if len(key.split()) > 2:
        # Use center of known regions as fallback
        result = {"lat": 29.0, "lng": 42.0, "name": location}
        _memory_cache[key] = result
        return result

    # Layer 3: Nominatim API
    for attempt in range(retries):
        try:
            time.sleep(1)  # Respect Nominatim rate limit
            geo = _geolocator.geocode(location, timeout=5)
            if geo:
                result = {"lat": geo.latitude, "lng": geo.longitude, "name": geo.address}
                _memory_cache[key] = result
                return result
        except (GeocoderTimedOut, GeocoderUnavailable):
            if attempt < retries - 1:
                time.sleep(2)
            continue
        except Exception:
            break

    return None


def extract_locations(text: str) -> list[str]:
    """Extract likely location mentions from article text."""
    candidates = []
    for location in KNOWN_LOCATIONS.keys():
        if location in text.lower():
            candidates.append(location.title())
    return candidates


if __name__ == "__main__":
    print("🌍 GNI Geocoder — Test Run\n")
    tests = ["Israel", "Tehran", "Ukraine", "Taiwan", "North Korea"]
    for loc in tests:
        result = geocode(loc)
        if result:
            print(f"  ✅ {loc:15} → lat={result['lat']:.4f}, lng={result['lng']:.4f}")
        else:
            print(f"  ❌ {loc:15} → Not found")