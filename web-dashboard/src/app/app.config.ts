import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { 
  LucideAngularModule, Accessibility, ArrowLeft, PlusCircle, MapPin, Eye, EyeOff, History, LogOut, RefreshCw, Car, Plus, Trash2, Filter, Navigation, AlertCircle, Check, BrainCircuit, ChevronRight, AlertTriangle, LayoutGrid, Sparkles, Map, ArrowRight, MousePointer2, Bug, Edit, Briefcase, Mail, Send, KeyRound, ShieldCheck, LockKeyhole, Circle, CheckCircle, CheckCircle2, Shield, MailCheck, Camera, Info, Receipt, ArrowDownCircle, Wallet, Bell, TrendingUp, BarChart3, PieChart, Activity, Calendar, Clock, Zap
} from 'lucide-angular';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    importProvidersFrom(
      LucideAngularModule.pick({ 
        Accessibility, ArrowLeft, PlusCircle, MapPin, Eye, EyeOff, History, LogOut, RefreshCw, Car, Plus, Trash2, Filter, Navigation, AlertCircle, Check, BrainCircuit, ChevronRight, AlertTriangle, LayoutGrid, Sparkles, Map, ArrowRight, MousePointer2, Bug, Edit, Briefcase, Mail, Send, KeyRound, ShieldCheck, LockKeyhole, Circle, CheckCircle, CheckCircle2, Shield, MailCheck, Camera, Info, Receipt, ArrowDownCircle, Wallet, Bell, TrendingUp, BarChart3, PieChart, Activity, Calendar, Clock, Zap
      })
    )
  ]
};
