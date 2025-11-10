import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import EXIF from 'exif-js';

const { width } = Dimensions.get('window');

export default function MetadataScreen({ route, navigation }) {
  const { image } = route.params;
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [address, setAddress] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  useEffect(() => {
    extractMetadata();
  }, []);

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
        <View style={styles.header}>
          <Text style={styles.title}>Image Metadata</Text>
        </View>

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
              <View style={styles.locationSection}>
                <Text style={styles.sectionTitle}>Location Data</Text>
                <Text style={styles.locationText}>
                  Latitude: {locationData.latitude.toFixed(6)}
                </Text>
                <Text style={styles.locationText}>
                  Longitude: {locationData.longitude.toFixed(6)}
                </Text>
                {address && (
                  <Text style={styles.locationText}>
                    Address: {address}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => navigation.navigate('Map', { location: locationData, image, address })}
                >
                  <Text style={styles.mapButtonText}>View on Map</Text>
                </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Select Another Image</Text>
          </TouchableOpacity>
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
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
