"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { StructuredResult, AnalysisResult, GenerationResult } from "@/types/index";

interface AppState {
  uploadedImages: File[];
  imagePreviewUrls: string[];
  ocrRawText: string;
  editedOcrText: string;
  isOcrLoading: boolean;
  isOcrComplete: boolean;
  currentStep: number;
  // 2단계 상태
  structuredResult: StructuredResult | null;
  structuredResults: StructuredResult[];
  selectedGroupIndex: number;
  isStructureLoading: boolean;
  isStructureComplete: boolean;
  // 3단계 상태
  analysisResult: AnalysisResult | null;
  isAnalysisLoading: boolean;
  isAnalysisComplete: boolean;
  // 4단계 상태
  generationResult: GenerationResult | null;
  isGenerationLoading: boolean;
  isGenerationComplete: boolean;
}

interface AppContextValue extends AppState {
  setUploadedImages: (files: File[]) => void;
  setImagePreviewUrls: (urls: string[]) => void;
  setOcrRawText: (text: string) => void;
  setEditedOcrText: (text: string) => void;
  setIsOcrLoading: (loading: boolean) => void;
  setIsOcrComplete: (complete: boolean) => void;
  setCurrentStep: (step: number) => void;
  resetImage: () => void;
  // 2단계 세터
  setStructuredResult: (result: StructuredResult | null) => void;
  setStructuredResults: (results: StructuredResult[]) => void;
  setSelectedGroupIndex: (index: number) => void;
  setIsStructureLoading: (loading: boolean) => void;
  setIsStructureComplete: (complete: boolean) => void;
  // 3단계 세터
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalysisLoading: (loading: boolean) => void;
  setIsAnalysisComplete: (complete: boolean) => void;
  // 4단계 세터
  setGenerationResult: (result: GenerationResult | null) => void;
  setIsGenerationLoading: (loading: boolean) => void;
  setIsGenerationComplete: (complete: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [ocrRawText, setOcrRawText] = useState<string>("");
  const [editedOcrText, setEditedOcrText] = useState<string>("");
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [isOcrComplete, setIsOcrComplete] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  // 2단계 상태
  const [structuredResult, setStructuredResult] = useState<StructuredResult | null>(null);
  const [structuredResults, setStructuredResults] = useState<StructuredResult[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(-1);
  const [isStructureLoading, setIsStructureLoading] = useState<boolean>(false);
  const [isStructureComplete, setIsStructureComplete] = useState<boolean>(false);
  // 3단계 상태
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState<boolean>(false);
  // 4단계 상태
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isGenerationLoading, setIsGenerationLoading] = useState<boolean>(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState<boolean>(false);

  const resetImage = useCallback(() => {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setUploadedImages([]);
    setImagePreviewUrls([]);
    setOcrRawText("");
    setEditedOcrText("");
    setIsOcrLoading(false);
    setIsOcrComplete(false);
    setCurrentStep(1);
    // 2단계 상태도 초기화
    setStructuredResult(null);
    setStructuredResults([]);
    setSelectedGroupIndex(-1);
    setIsStructureLoading(false);
    setIsStructureComplete(false);
    // 3단계 상태도 초기화
    setAnalysisResult(null);
    setIsAnalysisLoading(false);
    setIsAnalysisComplete(false);
    // 4단계 상태도 초기화
    setGenerationResult(null);
    setIsGenerationLoading(false);
    setIsGenerationComplete(false);
  }, [imagePreviewUrls]);

  return (
    <AppContext.Provider
      value={{
        uploadedImages,
        imagePreviewUrls,
        ocrRawText,
        editedOcrText,
        isOcrLoading,
        isOcrComplete,
        currentStep,
        structuredResult,
        structuredResults,
        selectedGroupIndex,
        isStructureLoading,
        isStructureComplete,
        analysisResult,
        isAnalysisLoading,
        isAnalysisComplete,
        setUploadedImages,
        setImagePreviewUrls,
        setOcrRawText,
        setEditedOcrText,
        setIsOcrLoading,
        setIsOcrComplete,
        setCurrentStep,
        resetImage,
        setStructuredResult,
        setStructuredResults,
        setSelectedGroupIndex,
        setIsStructureLoading,
        setIsStructureComplete,
        setAnalysisResult,
        setIsAnalysisLoading,
        setIsAnalysisComplete,
        generationResult,
        isGenerationLoading,
        isGenerationComplete,
        setGenerationResult,
        setIsGenerationLoading,
        setIsGenerationComplete,
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
