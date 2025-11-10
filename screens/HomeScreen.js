import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Meta Data</Text>
            <Text style={styles.subtitle}>Analyzer</Text>
            <Text style={styles.tagline}>Discover the hidden stories in your photos</Text>
          </View>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📍</Text>
              </View>
              <Text style={styles.featureText}>Location Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📸</Text>
              </View>
              <Text style={styles.featureText}>EXIF Data Analysis</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🗺️</Text>
              </View>
              <Text style={styles.featureText}>Map Visualization</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ImagePicker')}
          >
            <Text style={styles.buttonText}>Start Analyzing</Text>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  tagline: {
    fontSize: 16,
    color: '#e8e8e8',
    textAlign: 'center',
    opacity: 0.9,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 50,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
