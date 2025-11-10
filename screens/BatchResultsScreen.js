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

const { width } = Dimensions.get('window');

export default function BatchResultsScreen({ route, navigation }) {
  const { images } = route.params;
  const [batchResults, setBatchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentProcessing, setCurrentProcessing] = useState(0);

  useEffect(() => {
    processBatch();
  }, []);

  const processBatch = async () => {
    const results = [];
    setLoading(true);

    for (let i = 0; i < images.length; i++) {
      setCurrentProcessing(i + 1);
      try {
        const result = await analyzeImageMetadata(images[i]);
        results.push(result);
      } catch (error) {
        console.error('Error processing image:', error);
        results.push({
          image: images[i],
          error: 'Failed to analyze this image',
        });
      }
    }

    setBatchResults(results);
    setLoading(false);
  };

  const analyzeImageMetadata = async (image) => {
    // Simplified version of metadata extraction
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          image,
          hasLocation: Math.random() > 0.5, // Mock data
          hasDate: Math.random() > 0.3,
          camera: ['iPhone 15', 'Samsung Galaxy', 'Canon EOS', 'Sony Alpha'][Math.floor(Math.random() * 4)],
        });
      }, 1000); // Simulate processing time
    });
  };

  const navigateToDetail = (image) => {
    navigation.navigate('Metadata', { image });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>
              Analyzing {currentProcessing} of {images.length} photos...
            </Text>
            <Text style={styles.loadingSubtext}>
              This may take a moment
            </Text>
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
          <Text style={styles.title}>📊 Batch Analysis Results</Text>
          <Text style={styles.subtitle}>
            Processed {batchResults.length} photos
          </Text>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {batchResults.filter(r => r.hasLocation).length}
              </Text>
              <Text style={styles.statLabel}>📍 With Location</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {batchResults.filter(r => r.hasDate).length}
              </Text>
              <Text style={styles.statLabel}>📅 With Date</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {batchResults.filter(r => !r.error).length}
              </Text>
              <Text style={styles.statLabel}>✅ Successfully Analyzed</Text>
            </View>
          </View>

          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>📸 Photo Details</Text>
            {batchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resultItem}
                onPress={() => navigateToDetail(result.image)}
              >
                <Image
                  source={{ uri: result.image.uri }}
                  style={styles.resultImage}
                  resizeMode="cover"
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>Photo {index + 1}</Text>
                  {result.error ? (
                    <Text style={styles.resultError}>{result.error}</Text>
                  ) : (
                    <View>
                      <Text style={styles.resultDetail}>
                        📷 {result.camera}
                      </Text>
                      {result.hasLocation && (
                        <Text style={styles.resultDetail}>📍 Has location data</Text>
                      )}
                      {result.hasDate && (
                        <Text style={styles.resultDetail}>📅 Has date/time data</Text>
                      )}
                    </View>
                  )}
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back to Selection</Text>
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
    fontSize: 16,
    color: '#e8e8e8',
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
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#e8e8e8',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#e8e8e8',
    textAlign: 'center',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  resultDetail: {
    fontSize: 14,
    color: '#e8e8e8',
    marginBottom: 2,
  },
  resultError: {
    fontSize: 14,
    color: '#ff6b6b',
  },
  arrow: {
    fontSize: 24,
    color: '#e8e8e8',
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

