
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'mess_admin', 'boarder');
CREATE TYPE public.mess_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE public.boarder_status AS ENUM ('active', 'inactive', 'left');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bkash', 'nagad', 'bank');
CREATE TYPE public.stock_unit AS ENUM ('kg', 'litre', 'piece', 'gram', 'packet');
CREATE TYPE public.stock_txn_type AS ENUM ('in', 'out');

-- ============ MESSES ============
CREATE TABLE public.messes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status public.mess_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  mess_id UUID REFERENCES public.messes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_mess ON public.profiles(mess_id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  mess_id UUID REFERENCES public.messes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, mess_id)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_mess_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mess_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_mess_admin_of(_user_id UUID, _mess_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'mess_admin' AND mess_id = _mess_id
  );
$$;

-- ============ ROOMS ============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mess_id, room_number)
);
CREATE INDEX idx_rooms_mess ON public.rooms(mess_id);

-- ============ BOARDERS ============
CREATE TABLE public.boarders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guardian_name TEXT,
  guardian_phone TEXT,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  seat_number TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_deposit NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.boarder_status NOT NULL DEFAULT 'active',
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_boarders_mess ON public.boarders(mess_id);
CREATE INDEX idx_boarders_user ON public.boarders(user_id);
CREATE INDEX idx_boarders_status ON public.boarders(status);

-- ============ EXPENSE CATEGORIES ============
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID REFERENCES public.messes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_cats_mess ON public.expense_categories(mess_id);

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  bill_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_mess_date ON public.expenses(mess_id, expense_date);

-- ============ DEPOSITS ============
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deposits_boarder ON public.deposits(boarder_id);
CREATE INDEX idx_deposits_mess_date ON public.deposits(mess_id, deposit_date);

-- ============ MEAL ENTRIES ============
CREATE TABLE public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  breakfast NUMERIC(3,1) NOT NULL DEFAULT 0,
  lunch NUMERIC(3,1) NOT NULL DEFAULT 0,
  dinner NUMERIC(3,1) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boarder_id, meal_date)
);
CREATE INDEX idx_meals_mess_date ON public.meal_entries(mess_id, meal_date);

-- ============ STOCKS ============
CREATE TABLE public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit public.stock_unit NOT NULL DEFAULT 'kg',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stocks_mess ON public.stocks(mess_id);

-- ============ STOCK TRANSACTIONS ============
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  txn_type public.stock_txn_type NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_txn_stock ON public.stock_transactions(stock_id);

-- ============ NOTICES ============
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notices_mess ON public.notices(mess_id);

-- ============ ENABLE RLS ============
ALTER TABLE public.messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- MESSES
CREATE POLICY "super admin all messes" ON public.messes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "members view own mess" ON public.messes FOR SELECT TO authenticated
  USING (id = public.get_user_mess_id(auth.uid()));
CREATE POLICY "mess admin update own mess" ON public.messes FOR UPDATE TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), id)) WITH CHECK (public.is_mess_admin_of(auth.uid(), id));

-- PROFILES
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "super admin all profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin view mess profiles" ON public.profiles FOR SELECT TO authenticated
  USING (mess_id IS NOT NULL AND public.is_mess_admin_of(auth.uid(), mess_id));
CREATE POLICY "mess admin manage mess profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (mess_id IS NOT NULL AND public.is_mess_admin_of(auth.uid(), mess_id));
CREATE POLICY "mess admin update mess profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (mess_id IS NOT NULL AND public.is_mess_admin_of(auth.uid(), mess_id))
  WITH CHECK (mess_id IS NOT NULL AND public.is_mess_admin_of(auth.uid(), mess_id));

-- USER ROLES
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "super admin all roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin view mess roles" ON public.user_roles FOR SELECT TO authenticated
  USING (mess_id IS NOT NULL AND public.is_mess_admin_of(auth.uid(), mess_id));
CREATE POLICY "mess admin assign boarder role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    mess_id IS NOT NULL
    AND public.is_mess_admin_of(auth.uid(), mess_id)
    AND role = 'boarder'
  );

-- Generic helper: mess scoped policies for each table
-- ROOMS
CREATE POLICY "mess members view rooms" ON public.rooms FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- BOARDERS
CREATE POLICY "boarder view own record" ON public.boarders FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "mess admin view boarders" ON public.boarders FOR SELECT TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage boarders" ON public.boarders FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- EXPENSE CATEGORIES
CREATE POLICY "mess view categories" ON public.expense_categories FOR SELECT TO authenticated
  USING (is_default = true OR mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage categories" ON public.expense_categories FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- EXPENSES
CREATE POLICY "mess view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- DEPOSITS
CREATE POLICY "boarder view own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid()));
CREATE POLICY "mess admin view deposits" ON public.deposits FOR SELECT TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage deposits" ON public.deposits FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- MEAL ENTRIES
CREATE POLICY "boarder view own meals" ON public.meal_entries FOR SELECT TO authenticated
  USING (boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid()));
CREATE POLICY "mess admin view meals" ON public.meal_entries FOR SELECT TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage meals" ON public.meal_entries FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- STOCKS
CREATE POLICY "mess view stocks" ON public.stocks FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage stocks" ON public.stocks FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- STOCK TRANSACTIONS
CREATE POLICY "mess view stock txn" ON public.stock_transactions FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage stock txn" ON public.stock_transactions FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- NOTICES
CREATE POLICY "mess view notices" ON public.notices FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "mess admin manage notices" ON public.notices FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_messes_upd BEFORE UPDATE ON public.messes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_boarders_upd BEFORE UPDATE ON public.boarders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_meals_upd BEFORE UPDATE ON public.meal_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_stocks_upd BEFORE UPDATE ON public.stocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on new user signup (uses metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, mess_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'mess_id', '')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Default expense categories (mess_id NULL = global defaults)
INSERT INTO public.expense_categories (name, icon, is_default) VALUES
  ('Bazaar', 'ShoppingBasket', true),
  ('Rice', 'Wheat', true),
  ('Oil', 'Droplet', true),
  ('Gas', 'Flame', true),
  ('Electricity', 'Zap', true),
  ('WiFi', 'Wifi', true),
  ('Water', 'GlassWater', true),
  ('Maid Salary', 'UserCheck', true),
  ('Repair', 'Wrench', true),
  ('Others', 'MoreHorizontal', true);
