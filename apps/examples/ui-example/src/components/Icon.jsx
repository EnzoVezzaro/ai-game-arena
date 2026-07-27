import React from "react";
import {
  Circle, Flag, StepForward, Eye, MousePointerClick, Check, GitBranch, MessageCircle,
  TrendingUp, Users, Trophy, Octagon, LogIn, LogOut, Clock, Pause, Radio,
  Gamepad2, Square, Shield, Flame, Radar, BrainCircuit, Scale, MessageSquare,
  Download, Bot, BarChart3, Gauge, LayoutGrid, Zap, Activity, Cpu, Sparkles,
  ArrowRight, ArrowLeft, Play, RotateCcw, ChevronRight, ChevronDown, Search, Filter,
  Crown, Target, Crosshair, MapPin, Layers, Settings, Terminal, Wifi, Timer, Hash,
  Send, ThumbsUp, Plus, Minus, Maximize2, Volume2, Swords, Dot, CircuitBoard,
  Boxes, Plug, MonitorPlay, ScanLine, ListTree, PanelRight, Gauge as GaugeIcon,
  X, Trash2, Upload, Package, PackagePlus, Puzzle, Power, Save, Tag, Code2, Box, PowerOff, FileUp, GripVertical
} from "lucide-react";

const REGISTRY = {
  Circle, Flag, StepForward, Eye, MousePointerClick, Check, GitBranch, MessageCircle,
  TrendingUp, Users, Trophy, Octagon, LogIn, LogOut, Clock, Pause, Radio,
  Gamepad2, Square, Shield, Flame, Radar, BrainCircuit, Scale, MessageSquare,
  Download, Bot, BarChart3, Gauge, LayoutGrid, Zap, Activity, Cpu, Sparkles,
  ArrowRight, ArrowLeft, Play, RotateCcw, ChevronRight, ChevronDown, Search, Filter,
  Crown, Target, Crosshair, MapPin, Layers, Settings, Terminal, Wifi, Timer, Hash,
  Send, ThumbsUp, Plus, Minus, Maximize2, Volume2, Swords, Dot, CircuitBoard,
  Boxes, Plug, MonitorPlay, ScanLine, ListTree, PanelRight, Gauge: GaugeIcon,
  X, Trash2, Upload, Package, PackagePlus, Puzzle, Power, Save, Tag, Code2, Box, PowerOff, FileUp, GripVertical
};

export default function Icon({ name, className, size = 16, strokeWidth = 2, style }) {
  const Cmp = REGISTRY[name] || Circle;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} style={style} />;
}