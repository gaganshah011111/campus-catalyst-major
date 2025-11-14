import React from 'react';
import { Mail, Github, Linkedin, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Developer {
  name: string;
  role: string;
  image: string;
  email?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

const developers: Developer[] = [
  {
    name: 'Abhishek Pandey',
    role: 'Frontend Developer & UI/UX Designer',
    image: '/developer/Abhishek.webp',
    email: 'abhishekpandey.code@gmail.com',
    github: 'https://github.com/Abhishek-Mastercharm',
    linkedin: 'https://www.linkedin.com/in/--abhishekpandey/',
    website: 'https://abhishekcodebuddy.vercel.app/',
  },
  {
    name: 'Akashdeep',
    role: 'Backend Developer',
    image: '/developer/Akashdeep.webp',
    email: 'akashvohra9877@gmail.com',
    github: 'https://github.com/Akash1033',
    linkedin: 'https://www.linkedin.com/in/akash-vohra01/',
    website: 'https://akashdeep-vohra.vercel.app/',
  },
  {
    name: 'Gagan Kumar Shah',
    role: 'Database Developer',
    image: '/developer/Gagan.webp',
    email: 'gaganshah011111@gmail.com',
    github: 'https://github.com/gaganshah011111',
    linkedin: 'https://www.linkedin.com/in/shahgagan/',
    website: 'https://gagan-portfolio-delta.vercel.app/',
  },
];

const DeveloperSection: React.FC = () => {
  const { user } = useAuth();

  return (
    <section className="py-16 px-4 bg-muted/30 dark:bg-gray-800/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Meet the Developers</h2>
          <p className="text-muted-foreground text-lg">
            The talented team behind Advanced Campus Catalyst
          </p>
        </div>

        {/* Developer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {developers.map((developer, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center group"
            >
              {/* Developer Image */}
              <div className="relative mb-4 transform transition-transform duration-300 group-hover:scale-105">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg group-hover:border-primary/40 transition-colors">
                  <img
                    src={developer.image}
                    alt={developer.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to a placeholder if image fails to load
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(developer.name)}&size=200&background=8b5cf6&color=fff`;
                    }}
                  />
                </div>
                {/* Decorative Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/0 group-hover:border-primary/30 transition-all duration-300 scale-110"></div>
              </div>

              {/* Developer Info */}
              <h3 className="text-xl font-semibold mb-1">{developer.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{developer.role}</p>

              {/* Social Links */}
              <div className="flex gap-3">
                <TooltipProvider>
                  {developer.email && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`mailto:${developer.email}`}
                          className="w-10 h-10 rounded-full bg-card dark:bg-gray-800 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`Email ${developer.name}`}
                        >
                          <Mail size={18} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send Email</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {developer.website && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={developer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-card dark:bg-gray-800 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`${developer.name}'s Website`}
                        >
                          <Globe size={18} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Visit Website</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {developer.github && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={developer.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-card dark:bg-gray-800 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`${developer.name}'s GitHub`}
                        >
                          <Github size={18} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View GitHub</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {developer.linkedin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={developer.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-card dark:bg-gray-800 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`${developer.name}'s LinkedIn`}
                        >
                          <Linkedin size={18} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Connect on LinkedIn</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeveloperSection;
