import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

// Sessão do cliente. Fica num contexto porque três lugares distantes
// precisam saber quem está logado: a navbar (ícone de conta), as telas
// de login/criar conta (pra redirecionar quem já entrou) e o checkout
// (que só abre pra quem tem conta, decisão do cliente).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  // `carregando` existe pra evitar o flash de "deslogado": a sessão vem
  // do storage de forma assíncrona, e sem esperar a rota protegida
  // chutaria a pessoa pro login por um instante antes de reconhecê-la.
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSessao(data.session);
      setCarregando(false);
    });

    // Mantém tudo em dia: login, logout, refresh de token e — importante
    // — a volta do link de confirmação de e-mail, que chega pela URL.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
      setCarregando(false);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo(() => {
    const usuario = sessao?.user ?? null;
    return {
      usuario,
      sessao,
      carregando,
      logado: !!usuario,
      // nome de exibição: o que a pessoa digitou no cadastro; sem isso,
      // a parte do e-mail antes do @ — nunca o e-mail inteiro na tela
      nome:
        usuario?.user_metadata?.nome ||
        usuario?.email?.split("@")[0] ||
        "",

      entrar: (email, senha) =>
        supabase.auth.signInWithPassword({ email, password: senha }),

      criarConta: (email, senha, nome) =>
        supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        }),

      recuperarSenha: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        }),

      sair: () => supabase.auth.signOut(),
    };
  }, [sessao, carregando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

// Traduz os erros do Supabase, que chegam em inglês e técnicos demais
// ("Invalid login credentials"), pro que a pessoa precisa entender.
export function mensagemErro(erro) {
  if (!erro) return "";
  const m = (erro.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Esse e-mail já tem conta. Tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha precisa de pelo menos 8 caracteres.";
  // O Supabase recusa listando os alfabetos exigidos ("should contain at
  // least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEF...").
  // Ninguém que só quer comprar uma corrente merece ler isso.
  if (m.includes("should contain at least one character of each"))
    return "A senha precisa de letra minúscula, letra MAIÚSCULA e número.";
  if (m.includes("password is known to be weak") || m.includes("pwned"))
    return "Essa senha apareceu em vazamentos conhecidos. Escolha outra.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "E-mail inválido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return erro.message || "Não foi possível concluir. Tente de novo.";
}
