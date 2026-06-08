"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AppState {
  uploadedImage: File | null;
  imagePreviewUrl: string | null;
  ocrRawText: string;
  editedOcrText: string;
  isOcrLoading: boolean;
  isOcrComplete: boolean;
  currentStep: number;
}

interface AppContextValue extends AppState {
  setUploadedImage: (file: File | null) => void;
  setImagePreviewUrl: (url: string | null) => void;
  setOcrRawText: (text: string) => void;
  setEditedOcrText: (text: string) => void;
  setIsOcrLoading: (loading: boolean) => void;
  setIsOcrComplete: (complete: boolean) => void;
  setCurrentStep: (step: number) => void;
  resetImage: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrRawText, setOcrRawText] = useState<string>("");
  const [editedOcrText, setEditedOcrText] = useState<string>("");
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isOcrComplete, setIsOcrComplete] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

  const resetImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setUploadedImage(null);
    setImagePreviewUrl(null);
    setOcrRawText("");
    setEditedOcrText("");
    setIsOcrLoading(false);
    setIsOcrComplete(false);
  }, [imagePreviewUrl]);

  return (
    <AppContext.Provider
      value={{
        uploadedImage,
        imagePreviewUrl,
        ocrRawText,
        editedOcrText,
        isOcrLoading,
        isOcrComplete,
        currentStep,
        setUploadedImage,
        setImagePreviewUrl,
        setOcrRawText,
        setEditedOcrText,
        setIsOcrLoading,
        setIsOcrComplete,
        setCurrentStep,
        resetImage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

export { AppContext };
