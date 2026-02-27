from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Will be initialized with config
engine = None
async_session_factory = None


def init_db(database_url: str):
    global engine, async_session_factory
    engine = create_async_engine(database_url, echo=False)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with async_session_factory() as session:
        yield session
