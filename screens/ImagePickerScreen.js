import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ImagePickerScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async () => {
    try {
      setLoading(true);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to analyze images.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: true, // This ensures EXIF data is included
        allowsMultipleSelection: batchMode, // Enable multiple selection in batch mode
        selectionLimit: batchMode ? 10 : 1, // Limit to 10 images in batch mode
      });

      // Log EXIF data for debugging
      if (!result.canceled && result.assets[0].exif) {
        console.log('EXIF data from picker:', result.assets[0].exif);
      }

      if (!result.canceled) {
        if (batchMode) {
          setSelectedImages(result.assets);
          navigation.navigate('BatchResults', { images: result.assets });
        } else {
          setSelectedImage(result.assets[0]);
          // Don't navigate automatically - wait for user to press "Analyze Metadata"
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (selectedImage) {
      setAnalyzing(true);
      // Add a longer delay to show the loading state and simulate processing
      setTimeout(() => {
        setAnalyzing(false);
        navigation.navigate('Metadata', { image: selectedImage });
      }, 2500); // Increased from 800ms to 2500ms (2.5 seconds)
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Image</Text>
            <Text style={styles.subtitle}>Choose a photo to analyze its metadata</Text>
          </View>

          <View style={styles.imageContainer}>
            {selectedImage ? (
              <View style={styles.selectedImageWrapper}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
                <View style={styles.overlay}>
                  <Text style={styles.overlayText}>Image Selected</Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, !batchMode && styles.modeButtonActive]}
                onPress={() => setBatchMode(false)}
              >
                <Text style={[styles.modeButtonText, !batchMode && styles.modeButtonTextActive]}>
                  📷 Single Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, batchMode && styles.modeButtonActive]}
                onPress={() => setBatchMode(true)}
              >
                <Text style={[styles.modeButtonText, batchMode && styles.modeButtonTextActive]}>
                  📚 Batch Process (Max 10)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={pickImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>
                  {batchMode ? '📚 Select Multiple Photos' : (selectedImage ? '📷 Change Photo' : '📷 Select Photo')}
                </Text>
              )}
            </TouchableOpacity>

            {selectedImage && !batchMode && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  analyzing && styles.buttonDisabled
                ]}
                onPress={analyzeImage}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={[styles.secondaryButtonText, { marginLeft: 10 }]}>
                      Analyzing...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.secondaryButtonText}>🔍 Analyze Metadata</Text>
                )}
              </TouchableOpacity>
            )}
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8e8e8',
    textAlign: 'center',
    opacity: 0.9,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  selectedImageWrapper: {
    width: width - 60,
    height: width - 60,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 15,
    alignItems: 'center',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholder: {
    width: width - 60,
    height: width - 60,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.7,
  },
  buttonContainer: {
    gap: 15,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 5,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.7,
  },
  modeButtonTextActive: {
    color: '#667eea',
    opacity: 1,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  buttonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
