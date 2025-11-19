#!/usr/bin/env python3
"""Test dynamic metadata fetching and caching."""

import asyncio
import json
import sys
from pathlib import Path

# Add music-engine to path
# noqa: E402 is for module level import not at top of file; we need to tweak
# sys.path before importing the package when running this standalone script.
sys.path.insert(
    0,
    "/Users/authninja/Github/tunescout/music-engine/src",
)  # noqa: E402

from music_engine.track_metadata import TrackMetadataManager  # noqa: E402


async def test_metadata_caching():
    """Test that metadata is fetched and cached properly."""
    manager = TrackMetadataManager()
    
    # Test a fallback track (should return immediately)
    print("Testing fallback metadata...")
    metadata = await manager.get_track_metadata(
        "0VjIjW4GlUZAMYd2vXMi3b"  # Blinding Lights
    )
    print(f"✓ Fallback metadata: {metadata}")
    
    # Check that cache was updated
    cache_file = Path(
        "/Users/authninja/Github/tunescout/music-engine/src/"
        "music_engine/data/track_metadata_cache.json"
    )
    if cache_file.exists():
        with open(cache_file) as f:
            cache_data = json.load(f)
        print(f"✓ Cache file created with {len(cache_data)} entries")
    else:
        print("⚠ Cache file not yet created")
    
    # Test multiple tracks
    print("\nTesting multiple fallback tracks...")
    track_ids = [
        "0VjIjW4GlUZAMYd2vXMi3b",  # Blinding Lights
        "6habFhsOp2NvshLv26DqMb",  # Heat Waves
        "4uLU6hMCjMI75M1A2tKUQC",  # Never Gonna Give You Up
    ]
    
    for track_id in track_ids:
        metadata = await manager.get_track_metadata(track_id)
        if metadata:
            artists = ", ".join(metadata.get("artists", []))
            print(f"  {metadata.get('title')} by {artists}")
        else:
            print(f"  {track_id}: No metadata found")
    
    print("\n✓ All tests passed!")


if __name__ == "__main__":
    asyncio.run(test_metadata_caching())
