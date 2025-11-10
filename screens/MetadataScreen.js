import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import EXIF from 'exif-js';

const { width } = Dimensions.get('window');

export default function MetadataScreen({ route, navigation }) {
  const { image } = route.params;
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [address, setAddress] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [weatherData, setWeatherData] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const locationFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    extractMetadata();

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate location section when location data becomes available
  useEffect(() => {
    if (locationData) {
      Animated.timing(locationFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [locationData]);

  const extractMetadata = async () => {
    setProcessingComplete(false);
    try {
      setLoading(true);

      let exifData = {};

      // Always try to extract EXIF using the library first (more reliable for GPS)
      try {
        console.log('Extracting EXIF from file...');
        // Read the image file as base64 for EXIF extraction
        const fileInfo = await FileSystem.getInfoAsync(image.uri);
        const base64 = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Create a data URL for EXIF parsing
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        // Extract EXIF data using a Promise wrapper
        exifData = await new Promise((resolve) => {
          EXIF.getData({ src: dataUrl }, function() {
            const data = EXIF.getAllTags(this);
            resolve(data);
          });
        });
        console.log('EXIF extracted from file:', exifData);
      } catch (exifError) {
        console.warn('EXIF extraction from file failed:', exifError);
      }

      // Merge with EXIF data from image picker if available (for additional metadata)
      if (image.exif) {
        console.log('Merging with picker EXIF:', image.exif);
        exifData = { ...exifData, ...image.exif };
      }

      setMetadata(exifData);

      // Extract GPS data if available
      console.log('EXIF GPS data:', {
        GPSLatitude: exifData.GPSLatitude,
        GPSLatitudeRef: exifData.GPSLatitudeRef,
        GPSLongitude: exifData.GPSLongitude,
        GPSLongitudeRef: exifData.GPSLongitudeRef
      });

      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        const latitude = convertGPSCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef);
        const longitude = convertGPSCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef);

        console.log('Converted coordinates:', { latitude, longitude });

        if (latitude && longitude) {
          console.log('Setting location data:', { latitude, longitude });
          setLocationData({ latitude, longitude });
          // Perform reverse geocoding to get address
          await reverseGeocodeLocation(latitude, longitude);

          // Try to get photo date for weather data
          const photoDate = getPhotoDate(metadata);
          if (photoDate) {
            await fetchWeatherData(latitude, longitude, photoDate);
          }
        } else {
          console.log('Latitude or longitude conversion failed');
        }
      } else {
        console.log('No GPS data found in EXIF');
      }

      setLoading(false);
      setProcessingComplete(true);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      Alert.alert('Error', 'Failed to extract metadata from the image.');
      setLoading(false);
      setProcessingComplete(true);
    }
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const addressData = addresses[0];
        const formattedAddress = [
          addressData.city,
          addressData.region,
          addressData.country,
        ].filter(Boolean).join(', ');

        setAddress(formattedAddress || 'Location found but address unavailable');
      } else {
        setAddress('Unable to determine location');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress('Location lookup failed');
    }
  };

  const sharePhotoWithMetadata = async () => {
    try {
      let shareMessage = '📸 Photo Metadata Analysis\n\n';

      // Add basic info
      if (metadata?.Make && metadata?.Model) {
        shareMessage += `📷 Camera: ${metadata.Make} ${metadata.Model}\n`;
      }

      // Add date
      const photoDate = getPhotoDate(metadata);
      if (photoDate) {
        shareMessage += `📅 Taken: ${photoDate.toLocaleString()}\n`;
      }

      // Add location
      if (locationData && address) {
        shareMessage += `📍 Location: ${address}\n`;
        shareMessage += `🌍 Coordinates: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}\n`;
      }

      // Add weather
      if (weatherData) {
        shareMessage += `🌤️ Weather: ${weatherData.condition}, ${weatherData.temperature}°C\n`;
        shareMessage += `💧 Humidity: ${weatherData.humidity}%, 💨 Wind: ${weatherData.windSpeed} km/h\n`;
        shareMessage += `☀️ Sunrise: ${weatherData.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, 🌅 Sunset: ${weatherData.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
      }

      // Add camera settings
      if (metadata?.FNumber) shareMessage += `🔸 Aperture: f/${metadata.FNumber}\n`;
      if (metadata?.ExposureTime) {
        const exposure = metadata.ExposureTime < 1 ? `1/${Math.round(1/metadata.ExposureTime)}` : metadata.ExposureTime;
        shareMessage += `🔸 Shutter: ${exposure}s\n`;
      }
      if (metadata?.ISOSpeedRatings) shareMessage += `🔸 ISO: ${metadata.ISOSpeedRatings}\n`;
      if (metadata?.FocalLength) shareMessage += `🔸 Focal Length: ${metadata.FocalLength}mm\n`;

      shareMessage += '\n📱 Analyzed with MetaDataAnalyzer';

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(image.uri, {
          dialogTitle: 'Share Photo with Metadata',
          mimeType: 'image/jpeg',
        });
      } else {
        // Fallback: copy to clipboard or just show alert
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share photo.');
    }
  };

  const getPhotoDate = (metadata) => {
    if (!metadata) return null;

    // Try different date fields in order of preference
    const dateFields = ['DateTimeOriginal', 'DateTime', 'DateTimeDigitized'];

    for (const field of dateFields) {
      if (metadata[field]) {
        const parsedDate = parseEXIFDate(metadata[field]);
        if (parsedDate) return parsedDate;
      }
    }

    return null;
  };

  const fetchWeatherData = async (latitude, longitude, date) => {
    try {
      // For demo purposes, we'll generate realistic weather data
      // In a real app, you'd use a weather API like OpenWeatherMap
      const weatherConditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
      const temperatures = [15, 18, 22, 25, 28, 30];

      // Use location and date to generate consistent "random" weather
      const seed = Math.abs(latitude + longitude + date.getTime());
      const conditionIndex = seed % weatherConditions.length;
      const tempIndex = (seed * 7) % temperatures.length;

      const mockWeather = {
        condition: weatherConditions[conditionIndex],
        temperature: temperatures[tempIndex],
        humidity: 45 + (seed % 30), // 45-75%
        windSpeed: 5 + (seed % 15), // 5-20 km/h
        sunrise: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 30),
        sunset: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 45),
      };

      setWeatherData(mockWeather);
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const convertGPSCoordinate = (coordinate, ref) => {
    console.log('Converting GPS coordinate:', { coordinate, ref, coordinateType: typeof coordinate });

    if (!coordinate) return null;

    // Handle different GPS coordinate formats
    let degrees, minutes, seconds;

    if (Array.isArray(coordinate) && coordinate.length === 3) {
      // Standard format: [degrees, minutes, seconds]
      degrees = coordinate[0];
      minutes = coordinate[1];
      seconds = coordinate[2];
    } else if (typeof coordinate === 'number') {
      // Already decimal format
      return ref === 'S' || ref === 'W' ? -coordinate : coordinate;
    } else if (typeof coordinate === 'string') {
      // Try to parse as decimal string
      const parsed = parseFloat(coordinate);
      if (!isNaN(parsed)) {
        return ref === 'S' || ref === 'W' ? -parsed : parsed;
      }
      return null;
    } else {
      console.log('Unsupported coordinate format:', coordinate);
      return null;
    }

    // Handle rational numbers (fractions) in EXIF
    if (typeof degrees === 'object' && degrees.numerator !== undefined) {
      degrees = degrees.numerator / degrees.denominator;
    }
    if (typeof minutes === 'object' && minutes.numerator !== undefined) {
      minutes = minutes.numerator / minutes.denominator;
    }
    if (typeof seconds === 'object' && seconds.numerator !== undefined) {
      seconds = seconds.numerator / seconds.denominator;
    }

    // Convert to numbers if they're strings
    degrees = typeof degrees === 'string' ? parseFloat(degrees) : degrees;
    minutes = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
    seconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;

    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
      console.log('Invalid coordinate values:', { degrees, minutes, seconds });
      return null;
    }

    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    console.log('Converted coordinate result:', decimal);
    return decimal;
  };

  const parseEXIFDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;

    // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
    // Convert to ISO format "YYYY-MM-DDTHH:MM:SS"
    const isoDateString = dateString.replace(/:/g, '-').replace(' ', 'T');

    try {
      const date = new Date(isoDateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Failed to parse EXIF date:', dateString, error);
      return null;
    }
  };

  const formatMetadataValue = (key, value) => {
    if (value === null || value === undefined) return 'Not available';

    // Handle different data types
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return JSON.stringify(value);
    }

    // Format specific EXIF fields
    switch (key) {
      case 'DateTime':
      case 'DateTimeOriginal':
      case 'DateTimeDigitized':
        const parsedDate = parseEXIFDate(value);
        return parsedDate ? parsedDate.toLocaleString() : value;
      case 'GPSLatitude':
      case 'GPSLongitude':
        return Array.isArray(value) ? `${value[0]}° ${value[1]}' ${value[2]}"` : value;
      case 'FNumber':
        return `f/${value}`;
      case 'ExposureTime':
        return value < 1 ? `1/${Math.round(1/value)}s` : `${value}s`;
      case 'ISOSpeedRatings':
        return `ISO ${value}`;
      case 'FocalLength':
        return `${value}mm`;
      default:
        return value.toString();
    }
  };

  const renderMetadataItem = (key, value) => (
    <View key={key} style={styles.metadataItem}>
      <Text style={styles.metadataKey}>{key}:</Text>
      <Text style={styles.metadataValue}>{formatMetadataValue(key, value)}</Text>
    </View>
  );

  const getImportantMetadata = () => {
    if (!metadata) return [];

    const importantFields = [
      'DateTime',
      'DateTimeOriginal',
      'Make',
      'Model',
      'Software',
      'FNumber',
      'ExposureTime',
      'ISOSpeedRatings',
      'FocalLength',
      'GPSLatitude',
      'GPSLatitudeRef',
      'GPSLongitude',
      'GPSLongitudeRef',
      'GPSAltitude',
      'ImageWidth',
      'ImageHeight',
      'Orientation',
    ];

    return importantFields
      .filter(field => metadata[field] !== undefined)
      .map(field => ({ key: field, value: metadata[field] }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Analyzing metadata...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Image Metadata</Text>
        </Animated.View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image.uri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <View style={styles.metadataContainer}>
            <Text style={styles.sectionTitle}>Key Information</Text>
            {getImportantMetadata().map(item => renderMetadataItem(item.key, item.value))}

            {(() => {
              console.log('Render state:', { locationData: !!locationData, processingComplete, metadata: !!metadata });
              return null;
            })()}

            {locationData && (
              <Animated.View
                style={[
                  styles.locationSection,
                  {
                    opacity: locationFadeAnim,
                    transform: [{
                      translateY: locationFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.sectionTitle}>📍 Location Data</Text>
                <Text style={styles.locationText}>
                  Latitude: {locationData.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Longitude: {locationData.longitude.toFixed(6)}
                </Text>
                {address && (
                  <Text style={styles.locationText}>
                    📌 {address}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => navigation.navigate('Map', { location: locationData, image, address })}
                >
                  <Text style={styles.mapButtonText}>🗺️ View on Map</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {weatherData && (
              <View style={styles.weatherSection}>
                <Text style={styles.sectionTitle}>🌤️ Weather Conditions</Text>
                <View style={styles.weatherGrid}>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherIcon}>🌡️</Text>
                    <Text style={styles.weatherValue}>{weatherData.temperature}°C</Text>
                    <Text style={styles.weatherLabel}>Temperature</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherIcon}>💧</Text>
                    <Text style={styles.weatherValue}>{weatherData.humidity}%</Text>
                    <Text style={styles.weatherLabel}>Humidity</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherIcon}>💨</Text>
                    <Text style={styles.weatherValue}>{weatherData.windSpeed} km/h</Text>
                    <Text style={styles.weatherLabel}>Wind Speed</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherIcon}>☀️</Text>
                    <Text style={styles.weatherValue}>{weatherData.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    <Text style={styles.weatherLabel}>Sunrise</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherIcon}>🌅</Text>
                    <Text style={styles.weatherValue}>{weatherData.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    <Text style={styles.weatherLabel}>Sunset</Text>
                  </View>
                  <View style={[styles.weatherItem, { flex: 1 }]}>
                    <Text style={styles.weatherIcon}>
                      {weatherData.condition === 'Sunny' ? '☀️' :
                       weatherData.condition === 'Partly Cloudy' ? '⛅' :
                       weatherData.condition === 'Cloudy' ? '☁️' :
                       weatherData.condition === 'Light Rain' ? '🌦️' : '🌤️'}
                    </Text>
                    <Text style={styles.weatherValue}>{weatherData.condition}</Text>
                    <Text style={styles.weatherLabel}>Conditions</Text>
                  </View>
                </View>
              </View>
            )}

            {processingComplete && !locationData && metadata && (
              <View style={styles.noLocationContainer}>
                <Text style={styles.noLocationText}>📍 No location data found in this image</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={sharePhotoWithMetadata}
            >
              <Text style={styles.shareButtonText}>📤 Share Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Select Another Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: width - 60,
    height: 200,
    borderRadius: 15,
  },
  metadataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  metadataKey: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: '#e8e8e8',
    flex: 1,
    textAlign: 'right',
  },
  locationSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 5,
  },
  mapButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    marginTop: 15,
    alignSelf: 'center',
  },
  mapButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noLocationContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  noLocationText: {
    fontSize: 16,
    color: '#e8e8e8',
    textAlign: 'center',
  },
  weatherSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weatherItem: {
    alignItems: 'center',
    marginBottom: 15,
    minWidth: 80,
    flex: 1,
  },
  weatherIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  weatherValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  weatherLabel: {
    fontSize: 12,
    color: '#e8e8e8',
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#25D366', // WhatsApp green
    shadowColor: '#25D366',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
