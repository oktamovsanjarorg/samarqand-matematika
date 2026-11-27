-- T-189: JIT o'chiriladi. Ilova so'rovlari qisqa (millisekundlar), lekin xarajat noto'g'ri baholansa
-- Postgres so'rovni LLVM bilan kompilyatsiya qiladi va bunga 300 ms gacha ketadi (o'lchangan: dashboard
-- 58 → 79 ms, retry so'rovi 60 → 400 ms). Baza qayta ishga tushmaydi: yangi ulanishlarga ta'sir qiladi.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET jit = off', current_database());
END
$$;
