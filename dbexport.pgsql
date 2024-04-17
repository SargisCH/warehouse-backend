--
-- PostgreSQL database dump
--

-- Dumped from database version 14.9 (Ubuntu 14.9-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.9 (Ubuntu 14.9-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'MANAGER',
    'UNKNOWN'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'FAILED',
    'FINISHED'
);


ALTER TYPE public."TransactionStatus" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'IN',
    'OUT'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: WeekDay; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WeekDay" AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);


ALTER TYPE public."WeekDay" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Client" (
    id integer NOT NULL,
    name text NOT NULL,
    "companyCode" text NOT NULL,
    "companyType" text NOT NULL,
    "companyId" text NOT NULL,
    "accountNumber" text NOT NULL,
    "bankAccountNumber" text NOT NULL,
    "legalAddress" text NOT NULL,
    address text NOT NULL,
    "phoneNumber" text NOT NULL,
    "otherPhoneNumber" text NOT NULL,
    email text NOT NULL,
    "contactPerson" text NOT NULL,
    "taxId" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    "managerId" integer
);


ALTER TABLE public."Client" OWNER TO postgres;

--
-- Name: Client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Client_id_seq" OWNER TO postgres;

--
-- Name: Client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Client_id_seq" OWNED BY public."Client".id;


--
-- Name: Credit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Credit" (
    id integer NOT NULL,
    amount integer NOT NULL,
    "saleId" integer,
    currency text DEFAULT 'AMD'::text,
    "clientId" integer NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Credit" OWNER TO postgres;

--
-- Name: Credit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Credit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Credit_id_seq" OWNER TO postgres;

--
-- Name: Credit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Credit_id_seq" OWNED BY public."Credit".id;


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Customer" (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Customer" OWNER TO postgres;

--
-- Name: Customer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Customer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Customer_id_seq" OWNER TO postgres;

--
-- Name: Customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Customer_id_seq" OWNED BY public."Customer".id;


--
-- Name: Ingredient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ingredient" (
    "productId" integer NOT NULL,
    "inventoryId" integer NOT NULL,
    amount double precision NOT NULL,
    "amountUnit" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ingredient" OWNER TO postgres;

--
-- Name: Inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Inventory" (
    id integer NOT NULL,
    name text NOT NULL,
    amount double precision NOT NULL,
    "amountUnit" text NOT NULL,
    price double precision DEFAULT 0 NOT NULL,
    currency text DEFAULT 'AMD'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Inventory" OWNER TO postgres;

--
-- Name: InventorySupplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InventorySupplier" (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public."InventorySupplier" OWNER TO postgres;

--
-- Name: InventorySupplierOrder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InventorySupplierOrder" (
    id integer NOT NULL,
    "inventorySupplierId" integer NOT NULL,
    "orderDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT ''::text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InventorySupplierOrder" OWNER TO postgres;

--
-- Name: InventorySupplierOrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InventorySupplierOrderItem" (
    id integer NOT NULL,
    "inventorySupplierOrderId" integer NOT NULL,
    "inventoryId" integer NOT NULL,
    price double precision NOT NULL,
    "priceUnit" text NOT NULL,
    amount double precision NOT NULL,
    "amountUnit" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InventorySupplierOrderItem" OWNER TO postgres;

--
-- Name: InventorySupplierOrderItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InventorySupplierOrderItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."InventorySupplierOrderItem_id_seq" OWNER TO postgres;

--
-- Name: InventorySupplierOrderItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InventorySupplierOrderItem_id_seq" OWNED BY public."InventorySupplierOrderItem".id;


--
-- Name: InventorySupplierOrder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InventorySupplierOrder_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."InventorySupplierOrder_id_seq" OWNER TO postgres;

--
-- Name: InventorySupplierOrder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InventorySupplierOrder_id_seq" OWNED BY public."InventorySupplierOrder".id;


--
-- Name: InventorySupplier_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InventorySupplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."InventorySupplier_id_seq" OWNER TO postgres;

--
-- Name: InventorySupplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InventorySupplier_id_seq" OWNED BY public."InventorySupplier".id;


--
-- Name: Inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Inventory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Inventory_id_seq" OWNER TO postgres;

--
-- Name: Inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Inventory_id_seq" OWNED BY public."Inventory".id;


--
-- Name: Manager; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Manager" (
    id integer NOT NULL,
    name text NOT NULL,
    "phoneNumber" text NOT NULL,
    email text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Manager" OWNER TO postgres;

--
-- Name: Manager_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Manager_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Manager_id_seq" OWNER TO postgres;

--
-- Name: Manager_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Manager_id_seq" OWNED BY public."Manager".id;


--
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id integer NOT NULL,
    name text NOT NULL,
    price double precision NOT NULL,
    "priceUnit" text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductCategory" (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductCategory" OWNER TO postgres;

--
-- Name: ProductCategory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ProductCategory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."ProductCategory_id_seq" OWNER TO postgres;

--
-- Name: ProductCategory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ProductCategory_id_seq" OWNED BY public."ProductCategory".id;


--
-- Name: Product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Product_id_seq" OWNER TO postgres;

--
-- Name: Product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Product_id_seq" OWNED BY public."Product".id;


--
-- Name: Sale; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sale" (
    id integer NOT NULL,
    "clientId" integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    "partialCreditAmount" integer DEFAULT 0 NOT NULL,
    "paymentType" text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."Sale" OWNER TO postgres;

--
-- Name: SaleItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SaleItem" (
    id integer NOT NULL,
    price double precision NOT NULL,
    "priceUnit" text NOT NULL,
    amount double precision NOT NULL,
    "amountUnit" text NOT NULL,
    "saleId" integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    "inventoryId" integer,
    "clientId" integer,
    "inventorySupplierOrderId" integer,
    "stockProductId" integer NOT NULL,
    "originalPrice" integer
);


ALTER TABLE public."SaleItem" OWNER TO postgres;

--
-- Name: SaleItem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."SaleItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."SaleItem_id_seq" OWNER TO postgres;

--
-- Name: SaleItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."SaleItem_id_seq" OWNED BY public."SaleItem".id;


--
-- Name: Sale_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Sale_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Sale_id_seq" OWNER TO postgres;

--
-- Name: Sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Sale_id_seq" OWNED BY public."Sale".id;


--
-- Name: Schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Schedule" (
    id integer NOT NULL,
    "clientId" integer,
    "managerId" integer,
    "dayPlan" public."WeekDay"[]
);


ALTER TABLE public."Schedule" OWNER TO postgres;

--
-- Name: Schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Schedule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Schedule_id_seq" OWNER TO postgres;

--
-- Name: Schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Schedule_id_seq" OWNED BY public."Schedule".id;


--
-- Name: StockProduct; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StockProduct" (
    id integer NOT NULL,
    "inStock" double precision NOT NULL,
    "inStockUnit" text NOT NULL,
    "productId" integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockProduct" OWNER TO postgres;

--
-- Name: StockProduct_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."StockProduct_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."StockProduct_id_seq" OWNER TO postgres;

--
-- Name: StockProduct_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."StockProduct_id_seq" OWNED BY public."StockProduct".id;


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tenant" (
    id integer NOT NULL,
    name text NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "creditId" integer,
    currency text DEFAULT 'AMD'::text
);


ALTER TABLE public."Tenant" OWNER TO postgres;

--
-- Name: Tenant_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Tenant_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Tenant_id_seq" OWNER TO postgres;

--
-- Name: Tenant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Tenant_id_seq" OWNED BY public."Tenant".id;


--
-- Name: TradeCredit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TradeCredit" (
    id integer NOT NULL,
    name text NOT NULL,
    "customerId" integer NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'AMD'::text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TradeCredit" OWNER TO postgres;

--
-- Name: TradeCredit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TradeCredit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."TradeCredit_id_seq" OWNER TO postgres;

--
-- Name: TradeCredit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TradeCredit_id_seq" OWNED BY public."TradeCredit".id;


--
-- Name: TransactionHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TransactionHistory" (
    id integer NOT NULL,
    "transactionType" public."TransactionType" NOT NULL,
    amount double precision NOT NULL,
    "saleId" integer,
    "orderId" integer,
    "clientId" integer,
    "inventorySupplierId" integer,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus"
);


ALTER TABLE public."TransactionHistory" OWNER TO postgres;

--
-- Name: TransactionHistory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."TransactionHistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."TransactionHistory_id_seq" OWNER TO postgres;

--
-- Name: TransactionHistory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."TransactionHistory_id_seq" OWNED BY public."TransactionHistory".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text,
    "companyName" text,
    "tenantId" integer NOT NULL,
    role public."Role" DEFAULT 'UNKNOWN'::public."Role"
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Client id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client" ALTER COLUMN id SET DEFAULT nextval('public."Client_id_seq"'::regclass);


--
-- Name: Credit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Credit" ALTER COLUMN id SET DEFAULT nextval('public."Credit_id_seq"'::regclass);


--
-- Name: Customer id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Customer" ALTER COLUMN id SET DEFAULT nextval('public."Customer_id_seq"'::regclass);


--
-- Name: Inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory" ALTER COLUMN id SET DEFAULT nextval('public."Inventory_id_seq"'::regclass);


--
-- Name: InventorySupplier id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplier" ALTER COLUMN id SET DEFAULT nextval('public."InventorySupplier_id_seq"'::regclass);


--
-- Name: InventorySupplierOrder id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrder" ALTER COLUMN id SET DEFAULT nextval('public."InventorySupplierOrder_id_seq"'::regclass);


--
-- Name: InventorySupplierOrderItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrderItem" ALTER COLUMN id SET DEFAULT nextval('public."InventorySupplierOrderItem_id_seq"'::regclass);


--
-- Name: Manager id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Manager" ALTER COLUMN id SET DEFAULT nextval('public."Manager_id_seq"'::regclass);


--
-- Name: Product id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product" ALTER COLUMN id SET DEFAULT nextval('public."Product_id_seq"'::regclass);


--
-- Name: ProductCategory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductCategory" ALTER COLUMN id SET DEFAULT nextval('public."ProductCategory_id_seq"'::regclass);


--
-- Name: Sale id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sale" ALTER COLUMN id SET DEFAULT nextval('public."Sale_id_seq"'::regclass);


--
-- Name: SaleItem id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem" ALTER COLUMN id SET DEFAULT nextval('public."SaleItem_id_seq"'::regclass);


--
-- Name: Schedule id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedule" ALTER COLUMN id SET DEFAULT nextval('public."Schedule_id_seq"'::regclass);


--
-- Name: StockProduct id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockProduct" ALTER COLUMN id SET DEFAULT nextval('public."StockProduct_id_seq"'::regclass);


--
-- Name: Tenant id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tenant" ALTER COLUMN id SET DEFAULT nextval('public."Tenant_id_seq"'::regclass);


--
-- Name: TradeCredit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TradeCredit" ALTER COLUMN id SET DEFAULT nextval('public."TradeCredit_id_seq"'::regclass);


--
-- Name: TransactionHistory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory" ALTER COLUMN id SET DEFAULT nextval('public."TransactionHistory_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Client" (id, name, "companyCode", "companyType", "companyId", "accountNumber", "bankAccountNumber", "legalAddress", address, "phoneNumber", "otherPhoneNumber", email, "contactPerson", "taxId", created_at, updated_at, "managerId") FROM stdin;
1	aroi hayat	arh	lts	12345321	12342142	2345332145	34212ereq	12342t5dss	1234523143	321312	sda@gmail.com		214t432	2024-03-05 18:43:22.189	2024-03-05 18:43:22.189	\N
4	client 2	dasdasd	lts	21312	213213	213123	sfsfsdf	dsadsad	23131	213123	sdsad@asda.co		24214	2024-03-10 09:00:18.324	2024-03-10 09:00:18.324	\N
7	Client 5	213	lts	2313	12132131	123123	asdasdsa	asdasda	21313	123123	sdsa@adco		123231	2024-03-10 11:08:31.562	2024-03-10 11:08:31.562	2
8	bangladesh	3453	lts	234	12345	2345	dfghgfd	xdcfvghjk	3456543	23456543	hfhg@.com		345654	2024-03-10 14:59:24.604	2024-03-10 14:59:24.604	3
9	aygestan	632436346	lts	2222	2222	222	shdxsfgsh	sfhsfd	65656	1122	vffa@mail.ru		4253423	2024-03-22 18:20:53.864	2024-03-22 18:20:53.864	3
\.


--
-- Data for Name: Credit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Credit" (id, amount, "saleId", currency, "clientId", date) FROM stdin;
2	2000	\N	AMD	1	2024-03-09 10:39:28.026
3	1000	\N	AMD	1	2024-03-09 10:47:10.084
7	2005	\N	AMD	1	2024-03-09 11:00:21.351
6	2002	\N	AMD	1	2024-03-09 10:57:56.157
5	2010	\N	AMD	1	2024-03-09 10:57:43.293
4	2000	\N	AMD	1	2024-03-09 10:57:34.198
8	3000	\N	AMD	1	2024-03-05 13:55:23
9	1000	\N	AMD	8	2024-03-12 19:40:07
10	5000	12	AMD	9	2024-03-22 18:23:48.209
11	5000	13	AMD	9	2024-03-22 18:27:07.812
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Customer" (id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Ingredient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ingredient" ("productId", "inventoryId", amount, "amountUnit", created_at, updated_at) FROM stdin;
1	2	0.5	kg	2024-03-05 18:26:38.675	2024-03-05 18:26:38.675
1	1	0.5	kg	2024-03-05 18:26:38.675	2024-03-05 18:26:38.675
2	2	0.5	kg	2024-03-05 18:38:37.792	2024-03-05 18:38:37.792
2	1	0.5	kg	2024-03-05 18:38:37.792	2024-03-05 18:38:37.792
3	2	1	kg	2024-03-10 13:46:37.284	2024-03-10 13:46:37.284
3	1	1	kg	2024-03-10 13:46:37.284	2024-03-10 13:46:37.284
4	1	1.2	kg	2024-03-22 18:35:51.005	2024-03-22 18:35:51.005
\.


--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Inventory" (id, name, amount, "amountUnit", price, currency, created_at, updated_at) FROM stdin;
2	shaqar	83.5	kg	300	AMD	2024-03-05 18:24:38.926	2024-04-04 18:55:50.2
1	getnanush	88.3	kg	1100	AMD	2024-03-05 18:24:09.46	2024-04-04 18:55:50.2
\.


--
-- Data for Name: InventorySupplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InventorySupplier" (id, name, created_at, updated_at, deleted) FROM stdin;
1	surmalu	2024-03-05 18:46:52.41	2024-03-05 18:46:52.41	f
\.


--
-- Data for Name: InventorySupplierOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InventorySupplierOrder" (id, "inventorySupplierId", "orderDate", status, created_at, updated_at) FROM stdin;
1	1	2024-03-05 18:46:56.362		2024-03-05 18:47:13.229	2024-03-05 18:47:13.229
\.


--
-- Data for Name: InventorySupplierOrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InventorySupplierOrderItem" (id, "inventorySupplierOrderId", "inventoryId", price, "priceUnit", amount, "amountUnit", created_at, updated_at) FROM stdin;
1	1	1	1100	kg	30	kg	2024-03-05 18:47:13.229	2024-03-05 18:47:13.229
\.


--
-- Data for Name: Manager; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Manager" (id, name, "phoneNumber", email, created_at, updated_at) FROM stdin;
1	Sargis	096987986	sargis9888+2@gmail.com	2024-03-09 15:09:53.643	2024-03-09 15:09:53.643
2	Sargis2	096987986	sargis9888+3@gmail.com	2024-03-09 22:01:01.716	2024-03-09 22:01:01.716
3	Hakob	21346543	hak.gevorgyan95@gmail.com	2024-03-10 14:55:50.455	2024-03-10 14:55:50.455
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, name, price, "priceUnit", created_at, updated_at) FROM stdin;
2	qaxcr 2	1200	kg	2024-03-05 18:38:37.792	2024-03-05 18:44:27.354
1	qaxcr	1200	kg	2024-03-05 18:26:38.675	2024-03-05 18:49:49.174
3	qunjut g	1500	kg	2024-03-10 13:46:37.284	2024-03-10 13:46:37.284
4	axi maqrac	2000	kg	2024-03-22 18:35:51.005	2024-03-22 18:35:51.005
\.


--
-- Data for Name: ProductCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductCategory" (id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Sale" (id, "clientId", created_at, updated_at, "partialCreditAmount", "paymentType") FROM stdin;
10	8	2024-03-13 07:23:35.274	2024-03-13 07:23:35.274	0	CASH
11	8	2024-03-22 18:00:09.898	2024-03-22 18:00:09.898	0	CASH
12	9	2024-03-22 18:23:48.2	2024-03-22 18:23:48.2	5000	PARTIAL CREDIT
13	9	2024-03-22 18:27:07.802	2024-03-22 18:27:07.802	5000	PARTIAL CREDIT
14	4	2024-03-22 18:45:47.839	2024-03-22 18:45:47.839	0	TRANSFER
15	9	2024-03-25 20:20:53.828	2024-03-25 20:20:53.828	0	CASH
16	9	2024-03-25 20:21:46.245	2024-03-25 20:21:46.245	0	CASH
17	8	2024-03-25 20:29:04.333	2024-03-25 20:29:04.333	0	CASH
18	9	2024-03-25 20:30:58.316	2024-03-25 20:30:58.316	0	CASH
19	9	2024-03-25 20:31:57.503	2024-03-25 20:31:57.503	0	CASH
20	7	2024-03-25 20:37:49.565	2024-03-25 20:37:49.565	0	TRANSFER
21	9	2024-03-25 20:46:03.745	2024-03-25 20:46:03.745	0	TRANSFER
22	9	2024-04-04 18:42:04.938	2024-04-04 18:42:04.938	0	CASH
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SaleItem" (id, price, "priceUnit", amount, "amountUnit", "saleId", created_at, updated_at, "inventoryId", "clientId", "inventorySupplierOrderId", "stockProductId", "originalPrice") FROM stdin;
9	1200	kg	1	item	10	2024-03-13 07:23:35.274	2024-03-13 07:23:35.274	\N	\N	\N	2	\N
10	2000	kg	2	item	11	2024-03-22 18:00:09.898	2024-03-22 18:00:09.898	\N	\N	\N	1	\N
11	1500	kg	5	item	13	2024-03-22 18:27:07.802	2024-03-22 18:27:07.802	\N	\N	\N	1	\N
12	1000	kg	6	item	13	2024-03-22 18:27:07.802	2024-03-22 18:27:07.802	\N	\N	\N	2	\N
13	2000	kg	3	item	14	2024-03-22 18:45:47.839	2024-03-22 18:45:47.839	\N	\N	\N	4	\N
14	1500	kg	1	item	15	2024-03-25 20:20:53.828	2024-03-25 20:20:53.828	\N	\N	\N	2	\N
15	1500	kg	1	item	16	2024-03-25 20:21:46.245	2024-03-25 20:21:46.245	\N	\N	\N	2	\N
16	1800	kg	2	item	17	2024-03-25 20:29:04.333	2024-03-25 20:29:04.333	\N	\N	\N	4	2000
17	1300	kg	1	item	18	2024-03-25 20:30:58.316	2024-03-25 20:30:58.316	\N	\N	\N	1	\N
18	1400	kg	2	item	18	2024-03-25 20:30:58.316	2024-03-25 20:30:58.316	\N	\N	\N	2	1200
19	1300	kg	1	item	19	2024-03-25 20:31:57.503	2024-03-25 20:31:57.503	\N	\N	\N	1	\N
20	1500	kg	1	item	19	2024-03-25 20:31:57.503	2024-03-25 20:31:57.503	\N	\N	\N	2	1200
21	2300	kg	2	item	19	2024-03-25 20:31:57.503	2024-03-25 20:31:57.503	\N	\N	\N	4	2000
22	1500	kg	2	item	20	2024-03-25 20:37:49.565	2024-03-25 20:37:49.565	\N	\N	\N	2	\N
23	1500	kg	2	kg	22	2024-04-04 18:42:04.938	2024-04-04 18:42:04.938	\N	\N	\N	2	\N
\.


--
-- Data for Name: Schedule; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Schedule" (id, "clientId", "managerId", "dayPlan") FROM stdin;
4	7	2	{MONDAY,FRIDAY}
5	8	3	{MONDAY,FRIDAY}
6	9	3	{FRIDAY}
\.


--
-- Data for Name: StockProduct; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StockProduct" (id, "inStock", "inStockUnit", "productId", created_at, updated_at) FROM stdin;
1	-9	kg	2	2024-03-06 14:27:04.914	2024-03-25 20:31:57.492
4	7	kg	4	2024-03-22 18:36:23.836	2024-03-25 20:48:45.742
2	-11	kg	3	2024-03-10 13:47:03.917	2024-04-04 18:42:04.934
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tenant" (id, name, balance, "creditId", currency) FROM stdin;
1	snack	52700	\N	AMD
\.


--
-- Data for Name: TradeCredit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TradeCredit" (id, name, "customerId", amount, currency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: TransactionHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransactionHistory" (id, "transactionType", amount, "saleId", "orderId", "clientId", "inventorySupplierId", date, status) FROM stdin;
2	IN	1003	\N	\N	1	\N	2024-03-09 09:22:34.884	PENDING
3	IN	30000	\N	\N	1	\N	2024-03-10 13:57:59.285	PENDING
4	OUT	1000	\N	\N	\N	1	2024-03-10 13:58:53.399	PENDING
1	IN	2400	\N	\N	1	\N	2024-03-09 12:26:18.008	PENDING
6	IN	3000	20	\N	7	\N	2024-03-25 20:37:49.571	FINISHED
5	IN	6000	14	\N	4	\N	2024-03-22 18:45:47.848	FINISHED
7	IN	2000	21	\N	9	\N	2024-03-25 20:46:03.748	FINISHED
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, "companyName", "tenantId", role) FROM stdin;
1	sargis9888@gmail.com	e101a8bde395d77c:b86281c3d3aeb2cc9e0c9f157b000f9ac514489627f4dd9d3c20ad832c1f36e679d2b112632413add952edf24054df32514df4978b64a2904fee206650a3adb6	snack	1	ADMIN
2	sargis9888+3@gmail.com	f688d89471678f81:ffcded320446cebb7bfa0c61da908b0bf5a1da5be3b385da01e57808e284d011d053de701e40a1734b7fc59fdc0ed1fe148b61c9c68d9ca06c7bebd3a4a15e12	snack	1	ADMIN
3	hak.gevorgyan95@gmail.com	415a8d269e9891fd:7d87889c778b54d7cc1eafcf9a96d1bd95ea6e9ebee38b234edec1d7d911cfa57ad360c0839e2e41c826cd17bdd83f56b42cc09f8a5de69d9da56c4997462105	snack	1	MANAGER
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3b40e567-8593-4bf3-bc40-c4d39974fda7	8ecc9d3e45d135a32b1d9e3109864ee196f4fb6427078fdd09561fcaf689eed0	2024-03-05 21:53:18.702083+04	20240305144021_init	\N	\N	2024-03-05 21:53:18.655209+04	1
48ac2093-fabe-4312-b659-211f0ee6e1d7	3b4a82adccd1bdc2c63bc94fca713b91538e948d11d74e6d4b4cdf3993643432	2024-03-13 10:43:19.634618+04	20240313064319_init	\N	\N	2024-03-13 10:43:19.62936+04	1
2f40c599-f719-4a7f-b6ce-9e3b1fcb983e	85cf5370e5e3ccfc4ef97499320ab5ad99ac218948c06d424fa5a9cc310cbc45	2024-03-06 17:15:56.441262+04	20240306131556_init	\N	\N	2024-03-06 17:15:56.423586+04	1
f1aab7bd-42ac-4b55-80d9-5c39a24caf2f	1eb7fc195240dd1f54c115ebd0815ba88505393b2900ea213c4f3af9c3addffb	2024-03-06 17:31:50.4283+04	20240306133150_init	\N	\N	2024-03-06 17:31:50.423804+04	1
06386c41-6275-4e6e-b19d-47c58769cf15	95ce1f5335bfa1c5348f1367d59ce401adc897626733b579b58dae9374bf83bb	2024-03-08 23:15:48.443868+04	20240308191548_init	\N	\N	2024-03-08 23:15:48.43548+04	1
f4d1dfc6-ace4-4066-b3dc-47c6532c4dd9	1749dce9b31723f4a62fe94010e7dcb3535faacc491ce696dfc6ba3dd19fd62f	2024-03-13 10:56:20.047938+04	20240313065620_init	\N	\N	2024-03-13 10:56:20.044937+04	1
5b039d03-ad44-4be9-809e-e6c884323d60	790ccb8a700f03652fe01ec0ad9f669535a3ed499f38e99caf5e70f009c5696d	2024-03-09 00:14:35.960128+04	20240308201435_init	\N	\N	2024-03-09 00:14:35.957034+04	1
3e9c900f-8683-4d41-83b1-f2d2b4d63648	7b12feae0c3d330becfe35abd9beab9ce433714daadb411e5b02e85e04690287	2024-03-09 10:39:28.028602+04	20240309063928_init	\N	\N	2024-03-09 10:39:28.024758+04	1
9bcc4f2f-5ddc-474b-9e13-e51fa24fb584	55721e11cff661c71c4b415e62fbdd4b0ddc12aab08803aa1ae4788560bb6605	2024-03-09 11:29:45.318794+04	20240309072945_init	\N	\N	2024-03-09 11:29:45.313594+04	1
0d6933cc-e506-49be-8a53-45686d2cdeeb	32f317388c4bbeed3d960931647d586f3d0ec11be3382d1aac7a5961f08cd8b0	2024-03-13 18:52:33.395528+04	20240313145233_init	\N	\N	2024-03-13 18:52:33.388866+04	1
72a2720a-efeb-40d0-9a8d-63b16d5c9d8c	f31a95b8821762228f01d766452e01773bfa5dd84e70004d1724d5764aead31b	2024-03-09 11:46:10.891828+04	20240309074610_init	\N	\N	2024-03-09 11:46:10.887647+04	1
d1ff7e00-bf8e-415c-b856-e73bff90b1bb	954bef694b50e7bc2bfbca4f93592b3fadc177bd9dc999c990351d00fa0f0076	2024-03-09 12:26:18.009454+04	20240309082618_init	\N	\N	2024-03-09 12:26:18.006161+04	1
610c97d5-31b8-4b3d-8637-8d520102b66a	6bf4a6892557c5b19d8c7d37b6f8a3e97bc32476e0a53f02c00d5aaf76c9e8f8	2024-03-09 18:13:26.547315+04	20240309141326_init	\N	\N	2024-03-09 18:13:26.528169+04	1
995d5f09-934e-4e67-978d-b0a3aaa9b507	c69bc698e6f46a397878c68c48c87096554e0b10d99d28144bfa04637e5f6097	2024-03-25 23:46:57.41472+04	20240325194657_init	\N	\N	2024-03-25 23:46:57.409017+04	1
48868089-e7e5-4ca4-852f-dd0e40f91e61	9cb51e0b7636fa960d2bd9f801893d4151f9fbecb6d7514cfd9cd8926b70ca3d	2024-03-10 01:16:45.347026+04	20240309211645_init	\N	\N	2024-03-10 01:16:45.343899+04	1
986dadb6-3c9e-4a3c-b27f-63a9e4adf23a	0d16d30d5623a46a773f3cd879940ea1cc907bbaafae9a022379f47197bf4664	2024-03-10 12:13:15.339086+04	20240310081315_init	\N	\N	2024-03-10 12:13:15.32751+04	1
d105c6d6-e7b2-475d-854b-b8a055be98f8	e164f3d74c9e6616ed71391893d4e730343a21066279937128acf6c05ac42155	2024-03-10 12:54:07.448792+04	20240310085407_init	\N	\N	2024-03-10 12:54:07.445902+04	1
9eba5351-c359-453d-8a1f-a5ebe66ba1ca	08103772a7d4d3373d08616482687bd4f13aba7a5e265aca2a33677dec95e63b	2024-03-10 15:02:45.572445+04	20240310110245_init	\N	\N	2024-03-10 15:02:45.569756+04	1
\.


--
-- Name: Client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Client_id_seq"', 9, true);


--
-- Name: Credit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Credit_id_seq"', 11, true);


--
-- Name: Customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Customer_id_seq"', 1, false);


--
-- Name: InventorySupplierOrderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventorySupplierOrderItem_id_seq"', 1, true);


--
-- Name: InventorySupplierOrder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventorySupplierOrder_id_seq"', 1, true);


--
-- Name: InventorySupplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventorySupplier_id_seq"', 1, true);


--
-- Name: Inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Inventory_id_seq"', 2, true);


--
-- Name: Manager_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Manager_id_seq"', 3, true);


--
-- Name: ProductCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ProductCategory_id_seq"', 1, false);


--
-- Name: Product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Product_id_seq"', 4, true);


--
-- Name: SaleItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SaleItem_id_seq"', 23, true);


--
-- Name: Sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Sale_id_seq"', 22, true);


--
-- Name: Schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Schedule_id_seq"', 6, true);


--
-- Name: StockProduct_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."StockProduct_id_seq"', 5, true);


--
-- Name: Tenant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Tenant_id_seq"', 1, true);


--
-- Name: TradeCredit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TradeCredit_id_seq"', 1, false);


--
-- Name: TransactionHistory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TransactionHistory_id_seq"', 7, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 3, true);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: Credit Credit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Credit"
    ADD CONSTRAINT "Credit_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: Ingredient Ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("productId", "inventoryId");


--
-- Name: InventorySupplierOrderItem InventorySupplierOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrderItem"
    ADD CONSTRAINT "InventorySupplierOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: InventorySupplierOrder InventorySupplierOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrder"
    ADD CONSTRAINT "InventorySupplierOrder_pkey" PRIMARY KEY (id);


--
-- Name: InventorySupplier InventorySupplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplier"
    ADD CONSTRAINT "InventorySupplier_pkey" PRIMARY KEY (id);


--
-- Name: Inventory Inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_pkey" PRIMARY KEY (id);


--
-- Name: Manager Manager_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Manager"
    ADD CONSTRAINT "Manager_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: SaleItem SaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: Schedule Schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_pkey" PRIMARY KEY (id);


--
-- Name: StockProduct StockProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockProduct"
    ADD CONSTRAINT "StockProduct_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: TradeCredit TradeCredit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TradeCredit"
    ADD CONSTRAINT "TradeCredit_pkey" PRIMARY KEY (id);


--
-- Name: TransactionHistory TransactionHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Client_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Client_name_key" ON public."Client" USING btree (name);


--
-- Name: Credit_saleId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Credit_saleId_key" ON public."Credit" USING btree ("saleId");


--
-- Name: Customer_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Customer_name_key" ON public."Customer" USING btree (name);


--
-- Name: InventorySupplier_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "InventorySupplier_name_key" ON public."InventorySupplier" USING btree (name);


--
-- Name: Inventory_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Inventory_name_key" ON public."Inventory" USING btree (name);


--
-- Name: Manager_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Manager_name_key" ON public."Manager" USING btree (name);


--
-- Name: ProductCategory_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductCategory_name_key" ON public."ProductCategory" USING btree (name);


--
-- Name: Product_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_name_key" ON public."Product" USING btree (name);


--
-- Name: Schedule_managerId_clientId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Schedule_managerId_clientId_key" ON public."Schedule" USING btree ("managerId", "clientId");


--
-- Name: StockProduct_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StockProduct_productId_key" ON public."StockProduct" USING btree ("productId");


--
-- Name: TradeCredit_customerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TradeCredit_customerId_key" ON public."TradeCredit" USING btree ("customerId");


--
-- Name: TradeCredit_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TradeCredit_name_key" ON public."TradeCredit" USING btree (name);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Client Client_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."Manager"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Credit Credit_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Credit"
    ADD CONSTRAINT "Credit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Credit Credit_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Credit"
    ADD CONSTRAINT "Credit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ingredient Ingredient_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public."Inventory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ingredient Ingredient_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventorySupplierOrderItem InventorySupplierOrderItem_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrderItem"
    ADD CONSTRAINT "InventorySupplierOrderItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public."Inventory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventorySupplierOrderItem InventorySupplierOrderItem_inventorySupplierOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrderItem"
    ADD CONSTRAINT "InventorySupplierOrderItem_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES public."InventorySupplierOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventorySupplierOrder InventorySupplierOrder_inventorySupplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InventorySupplierOrder"
    ADD CONSTRAINT "InventorySupplierOrder_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES public."InventorySupplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleItem SaleItem_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public."Inventory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleItem SaleItem_inventorySupplierOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES public."InventorySupplierOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleItem SaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_stockProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_stockProductId_fkey" FOREIGN KEY ("stockProductId") REFERENCES public."StockProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Schedule Schedule_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Schedule Schedule_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."Manager"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockProduct StockProduct_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockProduct"
    ADD CONSTRAINT "StockProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Tenant Tenant_creditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES public."Credit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TradeCredit TradeCredit_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TradeCredit"
    ADD CONSTRAINT "TradeCredit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TransactionHistory TransactionHistory_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionHistory TransactionHistory_inventorySupplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES public."InventorySupplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionHistory TransactionHistory_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."InventorySupplierOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionHistory TransactionHistory_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

