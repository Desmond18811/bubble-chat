import BubbleLayout from "@/components/BubbleLayout";
import { Image, BarChart3, FileText, Smile, MoreHorizontal, MessageSquare, Repeat2, Heart, Share } from "lucide-react";
import spacePost from "@/assets/space-post.jpg";
import avatarWoman1 from "@/assets/avatar-woman1.jpg";
import avatarWoman2 from "@/assets/avatar-woman2.jpg";

const posts = [
  {
    id: 1,
    user: "Nova_Loom",
    handle: "@novaloom",
    time: "2h",
    avatar: avatarWoman1,
    text: 'Witnessing the convergence of stellar data and architectural rhythm. The new BUBBLE protocol is finally reaching its peak luminosity. #DataAesthetics #Luminous',
    image: spacePost,
    comments: 24,
    reposts: 12,
    likes: "1.2k",
  },
  {
    id: 2,
    user: "Cortex_Dev",
    handle: "@cortex_dev",
    time: "5h",
    avatar: null,
    text: '"Architecture is the learned game, correct and magnificent, of forms assembled in the light." - But make it digital. The observatory is live.',
    image: null,
    comments: 8,
    reposts: 42,
    likes: "389",
  },
  {
    id: 3,
    user: "Aether_Bound",
    handle: "@aether",
    time: "8h",
    avatar: null,
    text: "Mood board for the upcoming Flux event. We're leaning heavily into the obsidian glass aesthetic. Thoughts?",
    images: [avatarWoman1, avatarWoman2],
    comments: 156,
    reposts: 98,
    likes: "4.5k",
  },
];

const trending = [
  { tag: "#Crystalline", title: "The Obsidian Protocol", transmissions: "24.5K" },
  { tag: "#DeepObservatory", title: "BubbleWise AI v2.4", transmissions: "18.2K" },
  { tag: "#SpaceGrotesk", title: "Typography Evolution", transmissions: "12.1K" },
  { tag: "#TotalDark", title: "Interface Depth Systems", transmissions: "9.4K" },
];

const suggestedUsers = [
  { name: "Vector_Flux", handle: "@vflux" },
  { name: "Zenith_Mind", handle: "@zenith" },
];

const FeedPage = () => {
  return (
    <BubbleLayout>
      <div className="flex max-w-7xl mx-auto">
        {/* Main Feed */}
        <div className="flex-1 border-r border-border">
          {/* Compose */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex-shrink-0" />
              <div className="flex-1">
                <input
                  placeholder="Transmit a thought to the observatory..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm py-2"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <button className="text-muted-foreground hover:text-primary transition-colors"><Image className="w-5 h-5" /></button>
                    <button className="text-muted-foreground hover:text-primary transition-colors"><BarChart3 className="w-5 h-5" /></button>
                    <button className="text-muted-foreground hover:text-primary transition-colors"><FileText className="w-5 h-5" /></button>
                    <button className="text-muted-foreground hover:text-primary transition-colors"><Smile className="w-5 h-5" /></button>
                  </div>
                  <button className="bg-primary text-primary-foreground font-display font-semibold text-sm px-5 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    POST
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {posts.map((post) => (
            <article key={post.id} className="p-4 border-b border-border hover:bg-secondary/30 transition-colors">
              <div className="flex items-start gap-3">
                {post.avatar ? (
                  <img src={post.avatar} alt={post.user} className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" width={40} height={40} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary border border-border flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-foreground text-sm">{post.user}</span>
                    <span className="text-muted-foreground text-xs">{post.handle} · {post.time}</span>
                    <button className="ml-auto text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <p className="text-foreground text-sm mt-1 leading-relaxed">{post.text}</p>
                  {post.image && (
                    <img src={post.image} alt="Post content" className="mt-3 rounded-xl w-full max-h-72 object-cover" loading="lazy" width={768} height={512} />
                  )}
                  {post.images && (
                    <div className="flex gap-2 mt-3">
                      {post.images.map((img, i) => (
                        <img key={i} src={img} alt="Post content" className="rounded-xl flex-1 h-48 object-cover" loading="lazy" width={256} height={192} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-6 mt-3 text-muted-foreground text-xs">
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors"><MessageSquare className="w-4 h-4" />{post.comments}</button>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Repeat2 className="w-4 h-4" />{post.reposts}</button>
                    <button className="flex items-center gap-1.5 hover:text-primary transition-colors"><Heart className="w-4 h-4" />{post.likes}</button>
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Share className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 p-4 hidden lg:block">
          {/* Trending */}
          <div className="bg-card rounded-xl p-4 mb-4">
            <h3 className="font-display font-semibold text-primary text-sm mb-3">Trending Constructs</h3>
            {trending.map((t, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <span className="text-muted-foreground text-xs">{t.tag}</span>
                <p className="font-display font-semibold text-foreground text-sm">{t.title}</p>
                <span className="text-primary text-[10px] tracking-wider">{t.transmissions} TRANSMISSIONS</span>
              </div>
            ))}
            <button className="text-primary text-xs font-display font-semibold mt-2 tracking-wider hover:opacity-80">SHOW MORE</button>
          </div>

          {/* Connect Beings */}
          <div className="bg-card rounded-xl p-4">
            <h3 className="font-display font-semibold text-primary text-sm mb-3">Connect Beings</h3>
            {suggestedUsers.map((u, i) => (
              <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-10 h-10 rounded-full bg-bubble-green/20 border border-bubble-green/30" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm">{u.name}</p>
                  <p className="text-muted-foreground text-xs">{u.handle}</p>
                </div>
                <button className="border border-primary text-primary text-xs font-display font-semibold px-3 py-1 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 text-muted-foreground text-[10px] tracking-wider flex flex-wrap gap-3">
            <span>PRIVACY</span><span>TERMS</span><span>COOKIES</span><span>ADS INFO</span>
          </div>
          <p className="text-muted-foreground text-[10px] mt-1">© 2026 BUBBLE</p>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:scale-105 transition-transform lg:hidden">
        +
      </button>
    </BubbleLayout>
  );
};

export default FeedPage;
