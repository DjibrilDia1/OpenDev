from typing import Annotated

from pydantic import AfterValidator, StringConstraints


def validate_lowercase_username(value: str) -> str:
    if value != value.lower():
        raise ValueError("Username must be lowercase")
    return value


Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=30),
    AfterValidator(validate_lowercase_username),
]


def username_filter(value: str) -> str:
    """Equality consumes the entire value; HTTPX encodes it as one query parameter.

    Quoting is for composite operators such as ``in``, not scalar ``eq``:
    quotes here would become part of the username being compared.
    """
    return f"eq.{value}"
