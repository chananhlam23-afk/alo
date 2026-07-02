"use client";
import { useEffect, useState, Suspense, Fragment } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  EnvelopeIcon, KeyIcon, UserIcon, CarIcon,
  CheckCircleIcon, AlertTriangleIcon,
} from "@/components/ui/Icons";
import type { LandingConfigData } from "@/types/landing";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

type Tab = "otp" | "password" | "register-customer" | "register-driver";
type OtpStep = "email" | "code";

const LAST_TAB_KEY = "td_last_tab";

const OAUTH_ERRORS: Record<string, string> = {
  OAuthCallback:        "Google OAuth thất bại — kiểm tra cài đặt Google Console (redirect URI).",
  OAuthAccountNotLinked:"Email này đã đăng ký bằng mật khẩu. Dùng mục 'Mật khẩu' để đăng nhập.",
  OAuthCreateAccount:   "Không thể tạo tài khoản từ Google. Thử lại sau.",
  Callback:             "Lỗi callback xác thực. Thử lại sau.",
  AccessDenied:         "Bạn đã từ chối cấp quyền Google.",
  Verification:         "Liên kết xác thực không hợp lệ hoặc đã hết hạn.",
  Default:              "Đăng nhập thất bại. Vui lòng thử lại.",
};

interface Props {
  config: LandingConfigData;
}

function LoginPage({ config }: Props) {
  const searchParams = useSearchParams();
  const [tab,      setTab]      = useState<Tab>("otp");
  const [otpStep,  setOtpStep]  = useState<OtpStep>("email");
  const [email,    setEmail]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [hasFacebook, setHasFacebook] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [regStep,  setRegStep]  = useState<"form" | "otp">("form"); // đăng ký: nhập form → nhập OTP
  const [forgot,   setForgot]   = useState<null | "email" | "reset">(null); // quên mật khẩu

  const isBotDetected = () => honeypot.length > 0;
  const isRegister    = tab === "register-customer" || tab === "register-driver";
  const isDriver      = tab === "register-driver";

  useEffect(() => {
    const errCode = searchParams?.get("error");
    if (errCode) setMsg({ ok: false, text: OAUTH_ERRORS[errCode] ?? OAUTH_ERRORS.Default });
  }, [searchParams]);

  useEffect(() => {
    const qTab = searchParams?.get("tab");
    if (qTab === "register" || qTab === "register-driver") {
      setTab("register-driver");
    } else {
      const saved = localStorage.getItem(LAST_TAB_KEY) as Tab | null;
      if (saved && ["otp","password","register-customer","register-driver"].includes(saved)) setTab(saved);
    }
    getProviders().then((p) => { setHasGoogle(!!p?.google); setHasFacebook(!!p?.facebook); });
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t); setMsg(null); setOtpStep("email"); setRegStep("form"); setForgot(null); setOtp("");
    localStorage.setItem(LAST_TAB_KEY, t);
  };

  const goHome = () => { window.location.href = "/"; };
  const reset  = () => { setMsg(null); setOtp(""); };

  // Gửi mã OTP tới email (dùng chung cho: đăng nhập, đăng ký, đặt lại mật khẩu).
  // Trả true nếu gửi thành công.
  const requestOtpCode = async (purpose: "login" | "register" | "reset"): Promise<boolean> => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/v1/auth/email-otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Không gửi được OTP");
      // DEV: backend trả devOtp khi email chưa gửi được → tự điền + hiện để test.
      const devOtp: string | undefined = json.data?.devOtp;
      const emailSent: boolean | undefined = json.data?.emailSent;
      if (devOtp) {
        setOtp(devOtp);
        setMsg({
          ok: true,
          text: emailSent === false
            ? `⚠️ Email chưa gửi được (Resend chưa verify domain). Mã DEV: ${devOtp}`
            : `Mã đã gửi tới ${email}. Mã DEV: ${devOtp}`,
        });
      } else {
        setMsg({ ok: true, text: `Mã 6 chữ số đã gửi tới ${email}` });
      }
      return true;
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); return false; }
    finally { setLoading(false); }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await requestOtpCode("login")) setOtpStep("code");
  };

  // ── Đăng ký: bước 1 gửi OTP, bước 2 hoàn tất ─────────────────────────
  const sendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    if (await requestOtpCode("register")) setRegStep("otp");
  };

  // ── Quên mật khẩu: bước 1 gửi OTP, bước 2 đặt lại ────────────────────
  const sendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await requestOtpCode("reset")) setForgot("reset");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Không đặt lại được mật khẩu");
      setForgot(null); setTab("password"); setOtp(""); setPassword("");
      setMsg({ ok: true, text: "Đặt lại mật khẩu thành công! Đăng nhập bằng mật khẩu mới." });
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const res = await signIn("email-otp", { email, otp, redirect: false });
    setLoading(false);
    if (res?.error) setMsg({ ok: false, text: res.error });
    else goHome();
  };

  const loginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setMsg({ ok: false, text: res.error === "CredentialsSignin" ? "Email hoặc mật khẩu không đúng" : res.error });
    else goHome();
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const role = isDriver ? "DRIVER" : "CUSTOMER";
    try {
      const res  = await fetch("/api/v1/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role, otp }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      await signIn("credentials", { email, password, redirect: false });
      goHome();
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setLoading(false); }
  };

  const visibleFeatures = [...config.heroFeatures]
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div id="about" style={{
      minHeight: "100vh", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 16px 40px",  // 80px top accounts for sticky nav
      overflow: "hidden",
    }}>
      {/* Honeypot */}
      <input
        type="text" name="website" value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position:"absolute", left:"-9999px", width:1, height:1, opacity:0, pointerEvents:"none" }}
      />

      {/* ── Hero panel ───────────────────────────────────────── */}
      <div id="features" className="login-hero" style={{
        flex:1, maxWidth:520, marginRight:56, zIndex:10,
        display:"none", flexDirection:"column",
      }}>
        {/* Badge */}
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          background:"var(--bg-active)",border:"1px solid var(--border-medium)",
          borderRadius:999,padding:"6px 16px",marginBottom:28,width:"fit-content",
        }}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--brand-primary)",display:"inline-block"}}/>
          <span style={{color:"var(--text-secondary)",fontSize:13,letterSpacing:0.3}}>{config.heroBadge}</span>
        </div>

        {/* Headline */}
        <h1 style={{fontSize:"clamp(30px,3.6vw,48px)",fontWeight:800,lineHeight:1.15,color:"var(--text-primary)",marginBottom:18}}>
          {config.heroTitle}{" "}
          <span style={{color:"var(--brand-primary-dark)"}}>
            {config.heroHighlight}
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{color:"var(--text-secondary)",fontSize:15,lineHeight:1.9,marginBottom:36,whiteSpace:"pre-line"}}>
          {config.heroSubtitle.split("\n").map((line, i) =>
            i === 0 ? (
              <span key={i}>{line}</span>
            ) : (
              <Fragment key={i}>
                <br/><span style={{color:"var(--text-secondary)"}}>{line}</span>
              </Fragment>
            )
          )}
        </p>

        {/* Feature list */}
        {visibleFeatures.map((f) => (
          <div key={f.id} style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:22}}>
            <div style={{width:46,height:46,borderRadius:12,flexShrink:0,
              background:"var(--bg-active)",border:"1px solid var(--border-medium)",
              display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              <GeoIcon type={f.geoType} size={46}/>
            </div>
            <div style={{paddingTop:3}}>
              <div style={{color:"var(--text-primary)",fontWeight:700,fontSize:14,marginBottom:3}}>{f.title}</div>
              <div style={{color:"var(--text-secondary)",fontSize:13,lineHeight:1.6}}>{f.desc}</div>
            </div>
          </div>
        ))}

        {/* Social proof */}
        {config.socialVisible && (
          <div style={{
            marginTop:6,padding:"14px 18px",borderRadius:14,
            background:"var(--bg-overlay)",border:"1px solid var(--border-subtle)",
            display:"flex",alignItems:"center",gap:14,
          }}>
            <div style={{display:"flex"}}>
              {(["T","M","H","L","A"] as const).map((l, i) => (
                <div key={i} style={{
                  width:28,height:28,borderRadius:"50%",
                  background:["var(--brand-primary)","var(--brand-secondary)","var(--brand-emerald)","var(--brand-pink)","var(--brand-amber)"][i],
                  border:"2px solid var(--bg-surface)",marginLeft:i>0?-8:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,color:"#fff",fontWeight:700,
                }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{color:"var(--text-primary)",fontSize:13,fontWeight:600}}>{config.socialTitle}</div>
              <div style={{color:"var(--text-secondary)",fontSize:12,marginTop:2}}>{config.socialSub}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Login card ───────────────────────────────────────── */}
      <div
        id="login-card"
        style={{
          width:"100%",maxWidth:400,zIndex:10,position:"relative",
          background:"var(--bg-surface)",
          border:"1px solid var(--border-subtle)",borderRadius:20,
          padding:"28px 24px",
          boxShadow:"0 12px 36px rgba(14,27,24,.08)",
        }}
      >
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{
            marginBottom:16,display:"inline-flex",alignItems:"center",justifyContent:"center",position:"relative",
          }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{width:84,height:84,borderRadius:20,objectFit:"cover",position:"relative",
              border:"1px solid var(--border-subtle)",
              boxShadow:"0 6px 18px rgba(14,27,24,.10)"}}/>
          </div>
          {isRegister ? (
            <>
              <div style={{fontFamily:"var(--font-display)",color:"var(--text-primary)",fontWeight:800,fontSize:23,marginBottom:4,letterSpacing:.3}}>
                {isDriver ? "Trở thành Tài xế" : "Tạo tài khoản"}
              </div>
              <div style={{color:"var(--text-muted)",fontSize:12.5}}>
                {isDriver ? "Bắt đầu kiếm thêm thu nhập ngay hôm nay" : "Đặt chuyến nhanh, giá tốt mỗi ngày"}
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontFamily:"var(--font-display)",fontWeight:800,fontSize:28,marginBottom:5,letterSpacing:.2,
                color:"var(--text-primary)",
              }}>Thuận Chuyến</div>
              <div style={{color:"var(--text-muted)",fontSize:12.5}}>Chào mừng trở lại</div>
            </>
          )}
        </div>

        {/* Alert */}
        {msg && (
          <div style={{
            padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:14,
            background:msg.ok?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",
            border:`1px solid ${msg.ok?"rgba(34,197,94,.22)":"rgba(239,68,68,.22)"}`,
            color:msg.ok?"var(--success)":"var(--danger)",
          }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
              {msg.ok
                ? <CheckCircleIcon size={14} style={{display:"inline"}}/>
                : <AlertTriangleIcon size={14} style={{display:"inline"}}/>}
              {msg.text}
            </span>
          </div>
        )}

        {/* ════ LOGIN MODE ════ */}
        {!isRegister && forgot === null && (
          <>
            {(hasGoogle || hasFacebook) && (
              <>
                <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:2 }}>
                  {hasGoogle && <GoogleBtn loading={loading} tab={tab} />}
                  {hasFacebook && <FacebookBtn loading={loading} tab={tab} />}
                </div>
                <CardDivider label="hoặc dùng email" />
              </>
            )}

            <div style={{display:"flex",gap:3,background:"var(--bg-overlay)",border:"1px solid var(--border-subtle)",borderRadius:12,padding:4,marginBottom:16}}>
              <Pill active={tab==="otp"} onClick={()=>switchTab("otp")}>
                <EnvelopeIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>OTP Email
              </Pill>
              <Pill active={tab==="password"} onClick={()=>switchTab("password")}>
                <KeyIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Mật khẩu
              </Pill>
            </div>

            {tab==="otp" && otpStep==="email" && (
              <form onSubmit={sendOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Địa chỉ Email" autoFocus/>
                <NeonBtn loading={loading} label="Gửi mã OTP →"/>
              </form>
            )}

            {tab==="otp" && otpStep==="code" && (
              <form onSubmit={verifyOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{
                  textAlign:"center",padding:"10px 14px",borderRadius:10,
                  background:"var(--bg-active)",border:"1px solid var(--border-medium)",
                  color:"var(--brand-primary-dark)",fontSize:13,
                }}>
                  <EnvelopeIcon size={13} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>
                  Mã đã gửi tới <strong>{email}</strong>
                </div>
                <NeonInput
                  type="text" placeholder="• • • • • •" value={otp}
                  onChange={(v) => setOtp(v.replace(/\D/g,""))}
                  label="Nhập mã OTP (6 chữ số)" maxLength={6} autoFocus
                  style={{fontSize:26,letterSpacing:12,textAlign:"center",fontWeight:700}}
                />
                <NeonBtn loading={loading} label="Xác nhận đăng nhập" disabled={otp.length<6}/>
                <button type="button" onClick={()=>{setOtpStep("email");reset();}}
                  style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12,paddingTop:2,textAlign:"center"}}>
                  ← Đổi email · Gửi lại
                </button>
              </form>
            )}

            {tab==="password" && (
              <form onSubmit={loginPassword} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Email"/>
                <NeonInput type="password" placeholder="••••••••" value={password} onChange={setPassword} label="Mật khẩu"/>
                <NeonBtn loading={loading} label="Đăng nhập"/>
                <button type="button" onClick={()=>{ setForgot("email"); setMsg(null); setOtp(""); setPassword(""); }}
                  style={{background:"none",border:"none",color:"var(--brand-primary-dark)",cursor:"pointer",fontSize:12.5,fontWeight:600,paddingTop:2,textAlign:"center"}}>
                  Quên mật khẩu?
                </button>
              </form>
            )}

            <div style={{marginTop:20}}>
              <CardDivider label="Chưa có tài khoản?" />
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <RegisterCTA icon={<UserIcon size={15}/>} label="Đặt xe" sub="Khách hàng" color="#00806E" onClick={()=>switchTab("register-customer")}/>
                <RegisterCTA icon={<CarIcon size={15}/>}  label="Chạy xe" sub="Tài xế"     color="#C2410C" onClick={()=>switchTab("register-driver")}/>
              </div>
            </div>
          </>
        )}

        {/* ════ QUÊN MẬT KHẨU ════ */}
        {forgot !== null && (
          <>
            <button
              type="button"
              onClick={() => { setForgot(null); setTab("password"); setMsg(null); setOtp(""); setPassword(""); }}
              style={{
                background:"none",border:"1px solid var(--border-subtle)",
                borderRadius:8,color:"var(--text-muted)",cursor:"pointer",
                fontSize:12,padding:"6px 12px",marginBottom:16,
                display:"inline-flex",alignItems:"center",gap:5,transition:"all .2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--brand-primary)"; e.currentTarget.style.color="var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.color="var(--text-muted)"; }}
            >
              ← Quay lại đăng nhập
            </button>

            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:19,color:"var(--text-primary)",marginBottom:4}}>
                Đặt lại mật khẩu
              </div>
              <div style={{color:"var(--text-muted)",fontSize:12.5,lineHeight:1.6}}>
                {forgot === "email"
                  ? "Nhập email tài khoản, chúng tôi sẽ gửi mã xác thực về Gmail của bạn."
                  : "Nhập mã 6 chữ số vừa gửi tới email và đặt mật khẩu mới."}
              </div>
            </div>

            {forgot === "email" && (
              <form onSubmit={sendForgotOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Email" autoFocus/>
                <NeonBtn loading={loading} label="Gửi mã đặt lại →"/>
              </form>
            )}

            {forgot === "reset" && (
              <form onSubmit={resetPassword} style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{
                  textAlign:"center",padding:"10px 14px",borderRadius:10,
                  background:"var(--bg-active)",border:"1px solid var(--border-medium)",
                  color:"var(--brand-primary-dark)",fontSize:13,
                }}>
                  <EnvelopeIcon size={13} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>
                  Mã đã gửi tới <strong>{email}</strong>
                </div>
                <NeonInput
                  type="text" placeholder="• • • • • •" value={otp}
                  onChange={(v) => setOtp(v.replace(/\D/g,""))}
                  label="Mã OTP (6 chữ số)" maxLength={6} autoFocus
                  style={{fontSize:26,letterSpacing:12,textAlign:"center",fontWeight:700}}
                />
                <NeonInput type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={setPassword} label="Mật khẩu mới"/>
                <NeonBtn loading={loading} label="Đặt lại mật khẩu" disabled={otp.length<6 || password.length<8}/>
                <button type="button" onClick={()=>{ setForgot("email"); setOtp(""); setMsg(null); }}
                  style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12,paddingTop:2,textAlign:"center"}}>
                  ← Đổi email · Gửi lại mã
                </button>
              </form>
            )}
          </>
        )}

        {/* ════ REGISTER MODE ════ */}
        {isRegister && forgot === null && (
          <>
            <button
              type="button"
              onClick={() => switchTab("otp")}
              style={{
                background:"none",border:"1px solid var(--border-subtle)",
                borderRadius:8,color:"var(--text-muted)",cursor:"pointer",
                fontSize:12,padding:"6px 12px",marginBottom:16,
                display:"inline-flex",alignItems:"center",gap:5,transition:"all .2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--brand-primary)"; e.currentTarget.style.color="var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.color="var(--text-muted)"; }}
            >
              ← Quay lại đăng nhập
            </button>

            <div style={{display:"flex",gap:3,background:"var(--bg-overlay)",border:"1px solid var(--border-subtle)",borderRadius:12,padding:4,marginBottom:16}}>
              <Pill active={tab==="register-customer"} onClick={()=>switchTab("register-customer")} color="#00806E">
                <UserIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Đặt xe (Khách)
              </Pill>
              <Pill active={tab==="register-driver"} onClick={()=>switchTab("register-driver")} color="#C2410C">
                <CarIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Chạy xe (Tài xế)
              </Pill>
            </div>

            {/* Bước 1: nhập thông tin → gửi mã OTP xác thực email */}
            {regStep === "form" && (
              <form onSubmit={sendRegisterOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="text" placeholder="Nguyễn Văn A" value={fullName} onChange={setFullName} label="Họ và tên" autoFocus/>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Email"/>
                <NeonInput type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={setPassword} label="Mật khẩu"/>
                <NeonBtn
                  loading={loading}
                  label="Gửi mã xác thực →"
                  color={isDriver ? "#C2410C" : undefined}
                />
                {isDriver && (
                  <p style={{fontSize:11,color:"var(--text-muted)",textAlign:"center",lineHeight:1.6,marginTop:2}}>
                    Sau đăng ký, hoàn thành <strong style={{color:"var(--text-secondary)"}}>KYC</strong> để bắt đầu nhận chuyến.
                  </p>
                )}
              </form>
            )}

            {/* Bước 2: nhập OTP để hoàn tất đăng ký */}
            {regStep === "otp" && (
              <form onSubmit={register} style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{
                  textAlign:"center",padding:"10px 14px",borderRadius:10,
                  background:"var(--bg-active)",border:"1px solid var(--border-medium)",
                  color:"var(--brand-primary-dark)",fontSize:13,
                }}>
                  <EnvelopeIcon size={13} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>
                  Mã xác thực đã gửi tới <strong>{email}</strong>
                </div>
                <NeonInput
                  type="text" placeholder="• • • • • •" value={otp}
                  onChange={(v) => setOtp(v.replace(/\D/g,""))}
                  label="Nhập mã OTP (6 chữ số)" maxLength={6} autoFocus
                  style={{fontSize:26,letterSpacing:12,textAlign:"center",fontWeight:700}}
                />
                <NeonBtn
                  loading={loading}
                  label={isDriver ? "Hoàn tất đăng ký Tài xế →" : "Hoàn tất đăng ký →"}
                  disabled={otp.length<6}
                  color={isDriver ? "#C2410C" : undefined}
                />
                <button type="button" onClick={()=>{ setRegStep("form"); setOtp(""); setMsg(null); }}
                  style={{background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:12,paddingTop:2,textAlign:"center"}}>
                  ← Sửa thông tin · Gửi lại mã
                </button>
              </form>
            )}
          </>
        )}

        <p style={{textAlign:"center",marginTop:20,fontSize:12}}>
          <a href="/guide" style={{color:"var(--brand-primary-dark)",textDecoration:"none",fontWeight:600}}>📖 Xem hướng dẫn sử dụng</a>
        </p>
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(min-width:900px){ .login-hero{display:flex!important} }
      `}</style>
    </div>
  );
}

export default function LoginForm({ config }: Props) {
  return (
    <Suspense>
      <LoginPage config={config} />
    </Suspense>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function CardDivider({ label }: { label: string }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}>
      <div style={{flex:1,height:1,background:"var(--border-line)"}}/>
      <span style={{color:"var(--text-muted)",fontSize:11,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"var(--border-line)"}}/>
    </div>
  );
}

// Nút social chỉ-logo (trend hiện tại): logo thương hiệu trong ô glass, hover sáng viền.
const socialBtnStyle: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 16,
  border: "1px solid var(--border-medium)",
  background: "var(--bg-glass-light)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "transform .2s cubic-bezier(.4,0,.2,1), box-shadow .2s, border-color .2s",
};
function socialHover(el: HTMLButtonElement, on: boolean, ring: string) {
  if (on) {
    el.style.transform = "translateY(-3px)";
    el.style.borderColor = ring;
    el.style.boxShadow = `0 8px 18px rgba(14,27,24,.12), 0 0 0 3px ${ring}`;
  } else {
    el.style.transform = "translateY(0)";
    el.style.borderColor = "var(--border-medium)";
    el.style.boxShadow = "none";
  }
}

function GoogleBtn({ loading, tab }: { loading: boolean; tab: Tab }) {
  return (
    <button
      type="button" aria-label="Tiếp tục với Google" title="Tiếp tục với Google"
      onClick={() => { localStorage.setItem(LAST_TAB_KEY, tab); signIn("google", { callbackUrl:"/" }); }}
      disabled={loading}
      style={socialBtnStyle}
      onMouseEnter={(e) => socialHover(e.currentTarget, true, "rgba(66,133,244,.55)")}
      onMouseLeave={(e) => socialHover(e.currentTarget, false, "")}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    </button>
  );
}

function FacebookBtn({ loading, tab }: { loading: boolean; tab: Tab }) {
  return (
    <button
      type="button" aria-label="Tiếp tục với Facebook" title="Tiếp tục với Facebook"
      onClick={() => { localStorage.setItem(LAST_TAB_KEY, tab); signIn("facebook", { callbackUrl:"/" }); }}
      disabled={loading}
      style={socialBtnStyle}
      onMouseEnter={(e) => socialHover(e.currentTarget, true, "rgba(24,119,242,.6)")}
      onMouseLeave={(e) => socialHover(e.currentTarget, false, "")}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill="#1877F2"/>
        <path fill="#fff" d="M16.4 8.3h-2c-.32 0-.66.42-.66.93v1.46h2.66l-.41 2.74h-2.25V20h-2.83v-6.57H8.7v-2.74h2.2V9.05c0-1.93 1.12-3.13 2.92-3.13h2.58V8.3z"/>
      </svg>
    </button>
  );
}

function Pill({ active, onClick, children, color }: {
  active: boolean; onClick: () => void; children: React.ReactNode; color?: string;
}) {
  const c = color ?? "#00806E";
  return (
    <button onClick={onClick} type="button" style={{
      flex:1,padding:"9px 4px",border:"none",cursor:"pointer",borderRadius:9,
      fontSize:12,fontWeight:600,transition:"all .2s",
      background: active ? c : "transparent",
      color: active ? "#fff" : "var(--text-secondary)",
      boxShadow: active ? "0 1px 4px rgba(14,27,24,.12)" : "none",
    }}>
      {children}
    </button>
  );
}

function RegisterCTA({ icon, label, sub, color, onClick }: {
  icon: React.ReactNode; label: string; sub: string; color: string; onClick: () => void;
}) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        flex:1,padding:"12px 8px",borderRadius:12,cursor:"pointer",
        background:"var(--bg-overlay)",border:`1px solid var(--border-subtle)`,
        display:"flex",flexDirection:"column",alignItems:"center",gap:5,
        transition:"all .22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background=`${color}12`;
        e.currentTarget.style.borderColor=`${color}55`;
        e.currentTarget.style.transform="translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background="var(--bg-overlay)";
        e.currentTarget.style.borderColor="var(--border-subtle)";
        e.currentTarget.style.transform="translateY(0)";
      }}
    >
      <span style={{ color, width:34, height:34, borderRadius:9, background:`${color}16`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {icon}
      </span>
      <span style={{color:"var(--text-primary)",fontSize:13,fontWeight:700}}>{label}</span>
      <span style={{color:"var(--text-muted)",fontSize:11}}>{sub}</span>
    </button>
  );
}

function NeonInput({ type, placeholder, value, onChange, label, autoFocus, maxLength, style: extra }: {
  type: string; placeholder: string; value: string;
  onChange: (v: string) => void; label: string;
  autoFocus?: boolean; maxLength?: number; style?: React.CSSProperties;
}) {
  return (
    <div>
      <label style={{display:"block",color:"var(--text-muted)",fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:0.3}}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value} required
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus} maxLength={maxLength}
        style={{
          width:"100%",padding:"11px 14px",
          background:"var(--bg-overlay)",
          border:"1px solid var(--border-medium)",
          borderRadius:10,color:"var(--text-primary)",fontSize:14,outline:"none",
          transition:"all .2s",boxSizing:"border-box",...extra,
        }}
        onFocus={(e) => {
          e.target.style.borderColor="var(--brand-primary)";
          e.target.style.boxShadow="0 0 0 3px rgba(0,194,168,.18)";
          e.target.style.background="var(--bg-surface)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor="var(--border-medium)";
          e.target.style.boxShadow="none";
          e.target.style.background="var(--bg-overlay)";
        }}
      />
    </div>
  );
}

function NeonBtn({ loading, label, disabled, color }: {
  loading: boolean; label: string; disabled?: boolean; color?: string;
}) {
  const c = color ?? "#00C2A8";
  const ink = color ? "#fff" : "#04302A"; // xanh sáng → chữ tối; màu khác → chữ trắng
  return (
    <button
      type="submit" disabled={loading || disabled}
      style={{
        width:"100%",padding:"12px",marginTop:2,
        background: disabled ? "var(--bg-elevated)" : c,
        border:"none",borderRadius:10,color: disabled ? "var(--text-muted)" : ink,fontSize:14,fontWeight:700,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        transition:"all .18s",
        boxShadow: disabled ? "none" : `0 4px 14px ${c}33`,
        letterSpacing:0.2,
      }}
      onMouseEnter={(e) => { if (!loading && !disabled) { e.currentTarget.style.boxShadow=`0 6px 18px ${c}4d`; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow=`0 4px 14px ${c}33`; e.currentTarget.style.transform="translateY(0)"; }}
    >
      {loading ? (
        <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{
            width:15,height:15,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",
            borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite",
          }}/>
          Đang xử lý...
        </span>
      ) : label}
    </button>
  );
}
