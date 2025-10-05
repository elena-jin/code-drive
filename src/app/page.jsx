"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Code,
  Sparkles,
  Upload,
  FileText,
  Github,
  Cloud,
  Play,
  Pause,
  SkipBack,
  RotateCcw,
  Settings,
  Folder,
  GitBranch,
} from "lucide-react";
import useUpload from "@/utils/useUpload";
import useHandleStreamResponse from "@/utils/useHandleStreamResponse";

export default function CodeDrive() {
  const [isListening, setIsListening] = useState(false);
  const [code, setCode] = useState(
    '// Welcome to CodeDrive!\n// Say "add a function" to get started\n\nfunction hello() {\n  console.log("Hello, CodeDrive!");\n}',
  );
  const [lastCommand, setLastCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mascotVisible, setMascotVisible] = useState(false);

  // New state for TL;DR Mode
  const [activeMode, setActiveMode] = useState("code"); // 'code', 'tldr', 'github'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileSummary, setFileSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [recentFiles, setRecentFiles] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);

  // New state for GitHub Mode
  const [githubConnected, setGithubConnected] = useState(false);
  const [currentRepo, setCurrentRepo] = useState("");
  const [currentBranch, setCurrentBranch] = useState("main");
  const [pendingCommits, setPendingCommits] = useState([]);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const [upload, { loading: uploadLoading }] = useUpload();

  // Stream handling for AI responses
  const [streamingMessage, setStreamingMessage] = useState("");
  const handleFinish = useCallback((message) => {
    setFileSummary(message);
    setStreamingMessage("");
    setIsGeneratingSummary(false);
  }, []);
  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: handleFinish,
  });

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processVoiceCommand(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setLastCommand("Sorry, I didn't catch that. Try again!");
      };
    }

    // Initialize speech synthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window?.addEventListener("online", handleOnline);
    window?.addEventListener("offline", handleOffline);

    return () => {
      window?.removeEventListener("online", handleOnline);
      window?.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enhanced voice command processing
  const processVoiceCommand = useCallback(
    (transcript) => {
      setIsProcessing(true);
      setMascotVisible(true);
      setLastCommand(`Heard: "${transcript}"`);

      setTimeout(() => {
        let newCode = code;
        let response = "";
        const lowerTranscript = transcript.toLowerCase();

        // Code mode commands
        if (lowerTranscript.includes("add a function")) {
          newCode += "\n\nfunction newFunction() {\n  // Your code here\n}";
          response = "Added a new function for you!";
        } else if (lowerTranscript.includes("add a variable")) {
          newCode += '\n\nlet newVariable = "Hello World";';
          response = "Added a new variable!";
        } else if (lowerTranscript.includes("add a loop")) {
          newCode += "\n\nfor (let i = 0; i < 10; i++) {\n  console.log(i);\n}";
          response = "Added a for loop!";
        } else if (lowerTranscript.includes("clear code")) {
          newCode = "// Code cleared! Ready for new commands.";
          response = "Code cleared and ready!";
        }

        // TL;DR mode commands
        else if (
          lowerTranscript.includes("summarize") ||
          lowerTranscript.includes("upload file")
        ) {
          setActiveMode("tldr");
          response = "Switching to TL;DR mode. Upload a file to get started!";
        } else if (lowerTranscript.includes("play") && audioUrl) {
          playAudio();
          response = "Playing your summary!";
        } else if (lowerTranscript.includes("pause") && isPlaying) {
          pauseAudio();
          response = "Paused playback.";
        }

        // GitHub mode commands
        else if (
          lowerTranscript.includes("github") ||
          lowerTranscript.includes("commit")
        ) {
          setActiveMode("github");
          response = "Switching to GitHub mode!";
        } else if (lowerTranscript.includes("push to github")) {
          handleGitCommand("push");
          response = "Pushing changes to GitHub!";
        }

        // Mode switching
        else if (lowerTranscript.includes("code mode")) {
          setActiveMode("code");
          response = "Back to coding mode!";
        } else {
          response =
            'I\'m learning that command. Try "add a function", "summarize file", or "github mode"!';
        }

        setCode(newCode);
        setLastCommand(response);

        if (synthRef.current && !isOnline) {
          const utterance = new SpeechSynthesisUtterance(response);
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
          synthRef.current.speak(utterance);
        }

        setIsProcessing(false);
        setTimeout(() => setMascotVisible(false), 3000);
      }, 1500);
    },
    [code, audioUrl, isPlaying, isOnline],
  );

  // File upload handler
  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsGeneratingSummary(true);
      setMascotVisible(true);

      try {
        const { url, error } = await upload({ file });
        if (error) {
          setLastCommand(`Upload failed: ${error}`);
          return;
        }

        setUploadedFile({ name: file.name, url, type: file.type });

        // Generate AI summary
        const response = await fetch(
          "/integrations/chat-gpt/conversationgpt4",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant that creates concise, engaging TL;DR summaries of documents for audio narration. Keep summaries under 200 words and use a conversational tone perfect for listening while driving.",
                },
                {
                  role: "user",
                  content: `Please create a TL;DR summary of this ${file.type} file: ${file.name}. Make it engaging and easy to listen to.`,
                },
              ],
              stream: true,
            }),
          },
        );

        handleStreamResponse(response);

        // Add to recent files
        setRecentFiles((prev) => [
          { name: file.name, url, summary: "", timestamp: Date.now() },
          ...prev.slice(0, 4),
        ]);
      } catch (error) {
        setLastCommand("Failed to process file. Please try again.");
        setIsGeneratingSummary(false);
      }
    },
    [upload, handleStreamResponse],
  );

  // Audio playback functions
  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // GitHub functions
  const handleGitCommand = useCallback(
    async (command) => {
      if (!isOnline) {
        setPendingCommits((prev) => [
          ...prev,
          { command, code, timestamp: Date.now() },
        ]);
        setLastCommand("Offline - changes queued for sync");
        return;
      }

      setLastCommand(`Executing git ${command}...`);
      // In a real app, this would integrate with GitHub API
    },
    [code, isOnline],
  );

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setLastCommand("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setLastCommand("Listening... speak your command!");
    }
  };

  const speakCode = () => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(
        `Here's your current code: ${code}`,
      );
      utterance.rate = 0.8;
      synthRef.current.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-cyan-50 to-pink-50 p-4 font-['DM_Sans']">
      {/* Header with Mode Tabs */}
      <div className="text-center mb-6 pt-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Code className="text-cyan-600" size={32} />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            CodeDrive
          </h1>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setActiveMode("code")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === "code"
                ? "bg-cyan-500 text-white shadow-lg"
                : "bg-white/30 text-gray-700 hover:bg-white/50"
            }`}
          >
            <Code size={16} className="inline mr-1" />
            Code
          </button>
          <button
            onClick={() => setActiveMode("tldr")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === "tldr"
                ? "bg-pink-500 text-white shadow-lg"
                : "bg-white/30 text-gray-700 hover:bg-white/50"
            }`}
          >
            <FileText size={16} className="inline mr-1" />
            TL;DR
          </button>
          <button
            onClick={() => setActiveMode("github")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === "github"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-white/30 text-gray-700 hover:bg-white/50"
            }`}
          >
            <Github size={16} className="inline mr-1" />
            GitHub
          </button>
        </div>

        {/* Status indicators */}
        <div className="flex justify-center gap-4 text-xs text-gray-600">
          <div
            className={`flex items-center gap-1 ${isOnline ? "text-green-600" : "text-red-500"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            {isOnline ? "Online" : "Offline"}
          </div>
          {pendingCommits.length > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              {pendingCommits.length} queued
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm mt-2">
          {activeMode === "code" && "Talk your code into existence"}
          {activeMode === "tldr" &&
            "Turn your files into intelligent audio briefings"}
          {activeMode === "github" && "Code anywhere. Sync everywhere."}
        </p>
      </div>

      {/* Code Mode */}
      {activeMode === "code" && (
        <div className="relative mb-6">
          <div
            className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <button
                onClick={speakCode}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
              >
                <Volume2 size={16} className="text-gray-700" />
              </button>
            </div>

            <pre className="text-sm text-gray-800 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {code}
            </pre>
          </div>

          {/* Mascot Animation */}
          {mascotVisible && (
            <div className="absolute -top-4 -right-4 animate-bounce">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="text-white" size={24} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TL;DR Mode */}
      {activeMode === "tldr" && (
        <div className="space-y-6">
          {/* File Upload Panel */}
          <div
            className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.py,.js,.jsx,.ts,.tsx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                className="bg-gradient-to-r from-pink-400 to-cyan-400 text-white px-6 py-3 rounded-2xl font-medium hover:from-pink-500 hover:to-cyan-500 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                <Upload size={20} className="inline mr-2" />
                {uploadLoading ? "Uploading..." : "Upload File"}
              </button>
              <p className="text-gray-600 text-xs mt-2">
                PDF, TXT, DOCX, PY files supported
              </p>
            </div>
          </div>

          {/* Summary Panel */}
          {(fileSummary || streamingMessage || isGeneratingSummary) && (
            <div
              className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
                boxShadow:
                  "0 25px 50px -12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} />
                File Summary
              </h3>

              {isGeneratingSummary && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="animate-spin">
                    <Sparkles size={20} />
                  </div>
                  <span>Generating intelligent summary...</span>
                </div>
              )}

              <div className="text-gray-700 leading-relaxed">
                {streamingMessage && (
                  <div className="animate-pulse">{streamingMessage}</div>
                )}
                {fileSummary && <div>{fileSummary}</div>}
              </div>

              {fileSummary && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={playAudio}
                    className="bg-green-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-600 transition-all flex items-center gap-2"
                  >
                    <Play size={16} />
                    Play While Driving
                  </button>
                  <button className="bg-gray-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-600 transition-all flex items-center gap-2">
                    <RotateCcw size={16} />
                    Rewind 10s
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recent Files Carousel */}
          {recentFiles.length > 0 && (
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Folder size={20} />
                Recent Files
              </h3>
              <div className="flex gap-3 overflow-x-auto">
                {recentFiles.map((file, index) => (
                  <div
                    key={index}
                    className="min-w-[200px] bg-white/30 p-3 rounded-2xl"
                  >
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {file.name}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(file.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GitHub Mode */}
      {activeMode === "github" && (
        <div className="space-y-6">
          {/* GitHub Connection Panel */}
          <div
            className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <div className="text-center">
              {!githubConnected ? (
                <button
                  onClick={() => setGithubConnected(true)}
                  className="bg-gradient-to-r from-purple-400 to-blue-500 text-white px-6 py-3 rounded-2xl font-medium hover:from-purple-500 hover:to-blue-600 transition-all transform hover:scale-105"
                >
                  <Github size={20} className="inline mr-2" />
                  Connect GitHub
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Github size={20} />
                    <span className="font-medium">Connected to GitHub</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      Repo:{" "}
                      <span className="font-mono bg-white/20 px-2 py-1 rounded">
                        {currentRepo || "user/codedrive-project"}
                      </span>
                    </p>
                    <p>
                      Branch:{" "}
                      <span className="font-mono bg-white/20 px-2 py-1 rounded">
                        {currentBranch}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Git Visualization */}
          {githubConnected && (
            <div
              className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl p-6 shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
                boxShadow:
                  "0 25px 50px -12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <GitBranch size={20} />
                Voice Commands
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                <div className="bg-white/20 p-3 rounded-xl">
                  <strong>"Push to GitHub"</strong> - Commits and pushes current
                  changes
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <strong>"Create branch experimental"</strong> - Creates a new
                  branch
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <strong>"Show recent commits"</strong> - Lists recent commit
                  history
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Command Feedback Bubble */}
      {lastCommand && (
        <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="backdrop-blur-lg bg-gradient-to-r from-pink-200/40 to-cyan-200/40 border border-white/40 rounded-2xl p-4 text-center">
            <p className="text-gray-700 text-sm font-medium">{lastCommand}</p>
          </div>
        </div>
      )}

      {/* Centered Voice Control Button */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            relative w-20 h-20 rounded-full transition-all duration-300 transform active:scale-95 flex items-center justify-center
            ${
              isListening
                ? "bg-gradient-to-br from-red-400 to-pink-500 shadow-lg shadow-red-200"
                : "bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-200"
            }
            ${isProcessing ? "animate-pulse" : ""}
            hover:scale-105
          `}
          style={{
            boxShadow: isListening
              ? "0 0 30px rgba(239, 68, 68, 0.4), 0 10px 25px rgba(0,0,0,0.1)"
              : "0 0 30px rgba(34, 211, 238, 0.4), 0 10px 25px rgba(0,0,0,0.1)",
          }}
        >
          {isProcessing ? (
            <div className="animate-spin">
              <Sparkles className="text-white" size={32} />
            </div>
          ) : isListening ? (
            <MicOff className="text-white" size={32} />
          ) : (
            <Mic className="text-white" size={32} />
          )}

          {/* Pulse animation when listening */}
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"></div>
              <div
                className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"
                style={{ animationDelay: "0.5s" }}
              ></div>
            </>
          )}
        </button>

        {/* Button Label */}
        <div className="text-center mt-3">
          <p className="text-xs text-gray-600 font-medium">
            {isProcessing
              ? "Processing..."
              : isListening
                ? "Tap to stop"
                : "Tap to speak"}
          </p>
        </div>
      </div>

      {/* Quick Commands Help - Updated for current mode */}
      <div className="fixed bottom-32 left-4 right-4">
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Try saying:
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {activeMode === "code" && (
              <>
                <div>"Add a function"</div>
                <div>"Add a variable"</div>
                <div>"Add a loop"</div>
                <div>"Clear code"</div>
              </>
            )}
            {activeMode === "tldr" && (
              <>
                <div>"Upload file"</div>
                <div>"Play summary"</div>
                <div>"Pause"</div>
                <div>"Explain that again"</div>
              </>
            )}
            {activeMode === "github" && (
              <>
                <div>"Push to GitHub"</div>
                <div>"Create branch"</div>
                <div>"Show commits"</div>
                <div>"Code mode"</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element for TL;DR playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) =>
          setAudioProgress((e.target.currentTime / e.target.duration) * 100)
        }
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.5s ease-out;
        }
        
        .slide-in-from-bottom-4 {
          animation: slide-in-from-bottom-4 0.5s ease-out;
        }
        
        @keyframes slide-in-from-bottom-4 {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
