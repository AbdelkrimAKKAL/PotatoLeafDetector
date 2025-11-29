import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Vérification au démarrage
  useEffect(() => {  
    if (!API_URL) {
      Alert.alert(
        'Configuration Error', 
        'API URL is not configured. Please check your .env file or update config.js'
      );
    }
  }, []);

  // Image Picker avec validation
  const pickImage = async () => {
    try {
      // Demande de permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied', 
          'We need camera roll permissions to select images.'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Compression légère pour upload plus rapide
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Validation du format
        const uri = selectedAsset.uri;
        const validFormats = ['jpg', 'jpeg', 'png'];
        const extension = uri.split('.').pop()?.toLowerCase();
        
        if (!validFormats.includes(extension)) {
          Alert.alert(
            'Invalid Format', 
            'Please select a JPG or PNG image.'
          );
          return;
        }
        
        setSelectedImage(uri);
        setPrediction(null); 
        console.log('✅ Image selected:', uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Upload et prédiction
  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select a potato leaf image first.');
      return;
    }

    if (!API_URL) {
      Alert.alert(
        'Configuration Error', 
        'API URL is not configured. Please check your setup.'
      );
      return;
    }

    setIsLoading(true);

    try {
      // Prépare le FormData
      const filename = selectedImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage,
        type: type,
        name: filename || 'photo.jpg',
      });


      // Envoi à l'API
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000, // 15 secondes
      });

      console.log('Response:', response.data);
      setPrediction(response.data);
      

    } catch (error) {
      console.error('❌ API Error:', error);
      
      let errorMessage = 'Unable to connect to the API.';
      
      if (error.response) {
        // Le serveur a répondu avec une erreur
        errorMessage = `Server error: ${error.response.status}`;
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        // Pas de réponse du serveur
        errorMessage = 'No response from server.\n\nCheck:\n• Is the API running?\n• Same WiFi network?\n• Correct IP address?';
      } else {
        errorMessage = error.message;
      }
      
      Alert.alert('Prediction Failed ❌', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  //Interface
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🥔 Potato Leaf Detector</Text>

      {/* Bouton de sélection */}
      <View style={styles.buttonContainer}>
        <Button 
          title="📸 Select a Leaf Image" 
          onPress={pickImage} 
          color="#007AFF" 
        />
      </View>

      {/* Image sélectionnée */}
      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
        </View>
      )}

      {/* Bouton d'analyse */}
      {selectedImage && (
        <View style={styles.buttonContainer}>
          <Button 
            title={isLoading ? "🔍 Analyzing..." : "🚀 Get Prediction"} 
            onPress={uploadImage} 
            disabled={isLoading}
            color={isLoading ? "#AAAAAA" : "#4CAF50"}
          />
        </View>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing your leaf...</Text>
        </View>
      )}

      {/* Résultat */}
      {prediction && !isLoading && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Detection Result:</Text>
          <Text style={styles.resultClass}>{prediction.class.toUpperCase()}</Text>
          <Text style={styles.resultConfidence}>
            Confidence: {(prediction.confidence * 100).toFixed(2)}%
          </Text>
          
          {/* Barre de confiance visuelle */}
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${prediction.confidence * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Bouton reset */}
      {(selectedImage || prediction) && !isLoading && (
        <View style={styles.buttonContainer}>
          <Button 
            title="🔄 Delete Image" 
            onPress={() => {
              setSelectedImage(null);
              setPrediction(null);
            }} 
            color="#FF9800" 
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#95a5a6',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
  imageContainer: {
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: 280,
    height: 280,
    borderRadius: 12,
  },
  loadingContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  resultBox: {
    marginTop: 30,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  resultTitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '500',
  },
  resultClass: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultConfidence: {
    fontSize: 18,
    color: '#34495e',
    fontWeight: '600',
    marginBottom: 15,
  },
  confidenceBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
    borderRadius: 5,
  },
});