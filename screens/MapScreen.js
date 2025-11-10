import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ route, navigation }) {
  const { location, image, address } = route.params;
  const [mapError, setMapError] = useState(false);

  // Animation values
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const mapFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate header and map entrance
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(mapFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const mapRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerFadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>📍 Photo Location</Text>
          <Text style={styles.subtitle}>
            🌍 Lat: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.subtitle}>
            🌍 Lng: {location.longitude.toFixed(6)}
          </Text>
          {address && (
            <Text style={styles.subtitle}>
              📌 {address}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.mapContainer, { opacity: mapFadeAnim }]}>
          {!mapError ? (
            <MapView
              style={styles.map}
              region={mapRegion}
              showsUserLocation={false}
              showsMyLocationButton={false}
              zoomEnabled={true}
              scrollEnabled={true}
              onMapReady={() => setMapError(false)}
              onError={() => setMapError(true)}
            >
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Photo Location"
                description="This is where the photo was taken"
              >
                <View style={styles.markerContainer}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.markerImage}
                    resizeMode="cover"
                  />
                </View>
              </Marker>
            </MapView>
          ) : (
            <View style={styles.mapErrorContainer}>
              <Text style={styles.mapErrorText}>
                Unable to load map. Location coordinates:
              </Text>
              <Text style={styles.mapErrorCoords}>
                Lat: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.mapErrorCoords}>
                Lng: {location.longitude.toFixed(6)}
              </Text>
              {address && (
                <Text style={styles.mapErrorCoords}>
                  Address: {address}
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        <View style={styles.imagePreview}>
          <Image
            source={{ uri: image.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Metadata</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#e8e8e8',
    textAlign: 'center',
    opacity: 0.9,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  map: {
    flex: 1,
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
  },
  mapErrorText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  mapErrorCoords: {
    fontSize: 14,
    color: '#e8e8e8',
    textAlign: 'center',
    marginBottom: 5,
  },
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    position: 'absolute',
    bottom: 120,
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
