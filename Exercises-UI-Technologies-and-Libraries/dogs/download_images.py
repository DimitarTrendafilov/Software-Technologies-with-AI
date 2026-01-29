import urllib.request
import os
from pathlib import Path

# Create images directory if it doesn't exist
images_dir = Path(__file__).parent / "images"
images_dir.mkdir(exist_ok=True)

# Dog breeds and their corresponding Unsplash image URLs
breeds = {
    "golden-retriever.jpg": "https://images.unsplash.com/photo-1633722715463-d30628cqn509?w=400&h=300&fit=crop",
    "german-shepherd.jpg": "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=300&fit=crop",
    "labrador-retriever.jpg": "https://images.unsplash.com/photo-1554224311-beee415c15cb?w=400&h=300&fit=crop",
    "french-bulldog.jpg": "https://images.unsplash.com/photo-1583511655857-d19db992cb74?w=400&h=300&fit=crop",
    "siberian-husky.jpg": "https://images.unsplash.com/photo-1605804347493-5406d64872b5?w=400&h=300&fit=crop",
    "poodle.jpg": "https://images.unsplash.com/photo-1537151608828-8661a20b5c15?w=400&h=300&fit=crop",
    "bulldog.jpg": "https://images.unsplash.com/photo-1583511655857-d19db992cb74?w=400&h=300&fit=crop",
    "beagle.jpg": "https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=400&h=300&fit=crop",
    "dachshund.jpg": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop",
    "rottweiler.jpg": "https://images.unsplash.com/photo-1567270671170-fdc10a5bf831?w=400&h=300&fit=crop",
    "boxer.jpg": "https://images.unsplash.com/photo-1568393691622-c8ba131d63b2?w=400&h=300&fit=crop",
    "yorkshire-terrier.jpg": "https://images.unsplash.com/photo-1612003473085-e8644bfb0c92?w=400&h=300&fit=crop",
}

print("Downloading dog breed images...")
for filename, url in breeds.items():
    filepath = images_dir / filename
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"✓ Downloaded: {filename}")
    except Exception as e:
        print(f"✗ Failed to download {filename}: {e}")

print("\nAll images downloaded successfully!")
