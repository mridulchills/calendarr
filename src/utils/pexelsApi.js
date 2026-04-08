// Pexels API service for fetching aesthetic images per month
const PEXELS_API_KEY = 'NpP1KuJomTARGfGKIR5DM5yPpnT4r520z1e9w4r0EI5PP92U8B8Bjua5';
const PEXELS_BASE = 'https://api.pexels.com/v1';

// Season-appropriate search queries per month
const MONTH_QUERIES = {
  0: ['winter snow landscape', 'snowy mountains', 'winter forest', 'frozen lake'],
  1: ['winter sunset', 'cold morning frost', 'winter flowers', 'cozy winter'],
  2: ['spring blossoms', 'cherry blossom', 'spring meadow', 'spring rain'],
  3: ['spring flowers field', 'tulip garden', 'spring landscape', 'april flowers'],
  4: ['flower field colorful', 'wildflower meadow', 'may spring green', 'blooming garden'],
  5: ['summer beach sunset', 'tropical ocean', 'summer landscape', 'golden hour summer'],
  6: ['ocean waves blue', 'tropical beach', 'summer mountains', 'clear blue sky'],
  7: ['sunflower field', 'summer golden hour', 'lavender field', 'warm sunset'],
  8: ['autumn forest', 'fall leaves orange', 'september harvest', 'autumn landscape'],
  9: ['fall foliage', 'autumn maple', 'october forest', 'autumn mountain'],
  10: ['late autumn', 'misty morning forest', 'november rain', 'bare trees autumn'],
  11: ['christmas lights', 'winter wonderland', 'snow covered trees', 'december holiday'],
};

// Fallback gradients per month
export const MONTH_GRADIENTS = {
  0: 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 50%, #a8b5c2 100%)',
  1: 'linear-gradient(135deg, #d4e0ed 0%, #a8c0d8 50%, #7ba3c9 100%)',
  2: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 50%, #7bc88f 100%)',
  3: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #f8a4b8 100%)',
  4: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 50%, #f9d1d1 100%)',
  5: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 50%, #5b8def 100%)',
  6: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 50%, #89b4f5 100%)',
  7: 'linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f5976b 100%)',
  8: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #e88d67 100%)',
  9: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fda4af 100%)',
  10: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 50%, #e2a1cb 100%)',
  11: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6b5b95 100%)',
};

// Cache for fetched images
const imageCache = {};

export async function fetchMonthImages(month) {
  const cacheKey = `month_${month}`;
  
  // Return cached images
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }

  const queries = MONTH_QUERIES[month] || ['beautiful nature landscape'];
  
  try {
    // Fetch images for multiple queries to get variety
    const query = queries[Math.floor(Math.random() * queries.length)];
    const response = await fetch(
      `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape&size=large`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) throw new Error('Pexels API error');

    const data = await response.json();
    
    const images = data.photos.map(photo => ({
      id: photo.id,
      url: photo.src.landscape || photo.src.large,
      alt: photo.alt || `${query} - Photo by ${photo.photographer}`,
      photographer: photo.photographer,
      color: photo.avg_color,
    }));

    if (images.length > 0) {
      imageCache[cacheKey] = images;
      return images;
    }
  } catch (err) {
    console.warn('Failed to fetch from Pexels:', err);
  }

  return null; // Will use gradient fallback
}
